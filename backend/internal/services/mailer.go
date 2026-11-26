package services

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"
)

const implicitTLSPort = "465"

// Mailer sends a plain-text email.
type Mailer interface {
	Send(ctx context.Context, to, subject, body string) error
}

// SMTPConfig holds the outgoing mail server settings; an empty Host disables email.
type SMTPConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

type smtpMailer struct {
	cfg SMTPConfig
}

// NewSMTPMailer returns a TLS-only SMTP mailer, or nil when no server is configured.
func NewSMTPMailer(cfg SMTPConfig) Mailer {
	if cfg.Host == "" || cfg.From == "" {
		return nil
	}
	if cfg.Port == "" {
		cfg.Port = "587"
	}
	return &smtpMailer{cfg: cfg}
}

// Send delivers one message over implicit TLS (port 465) or STARTTLS; it never sends credentials in clear text.
func (m *smtpMailer) Send(ctx context.Context, to, subject, body string) error {
	if strings.ContainsAny(to+subject, "\r\n") {
		return errors.New("invalid mail header")
	}
	client, err := m.connect(ctx)
	if err != nil {
		return err
	}
	defer client.Close()
	if m.cfg.Username != "" {
		if err := client.Auth(smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := client.Mail(m.cfg.From); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(buildMessage(m.cfg.From, to, subject, body)); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

// connect opens the SMTP session and makes sure it is encrypted before anything else is sent.
func (m *smtpMailer) connect(ctx context.Context) (*smtp.Client, error) {
	addr := net.JoinHostPort(m.cfg.Host, m.cfg.Port)
	tlsCfg := &tls.Config{ServerName: m.cfg.Host, MinVersion: tls.VersionTLS12}
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	var conn net.Conn
	var err error
	if m.cfg.Port == implicitTLSPort {
		conn, err = (&tls.Dialer{NetDialer: dialer, Config: tlsCfg}).DialContext(ctx, "tcp", addr)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return nil, fmt.Errorf("smtp dial: %w", err)
	}
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}
	client, err := smtp.NewClient(conn, m.cfg.Host)
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	if m.cfg.Port == implicitTLSPort {
		return client, nil
	}
	if ok, _ := client.Extension("STARTTLS"); !ok {
		_ = client.Close()
		return nil, errors.New("smtp server does not offer STARTTLS")
	}
	if err := client.StartTLS(tlsCfg); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("smtp starttls: %w", err)
	}
	return client, nil
}

// buildMessage formats a UTF-8 plain-text email with an encoded subject.
func buildMessage(from, to, subject, body string) []byte {
	headers := []string{
		"From: " + from,
		"To: " + to,
		"Subject: " + mime.QEncoding.Encode("utf-8", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=utf-8",
		"Content-Transfer-Encoding: 8bit",
		"Date: " + time.Now().UTC().Format(time.RFC1123Z),
	}
	return []byte(strings.Join(headers, "\r\n") + "\r\n\r\n" + strings.ReplaceAll(body, "\n", "\r\n"))
}
