package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"golang.org/x/crypto/bcrypt"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

const (
	passwordResetTTL      = 30 * time.Minute
	passwordResetCooldown = time.Minute // at most one reset email per account per minute
	resetMailTimeout      = 20 * time.Second
)

// ErrInvalidResetToken means the reset link is unknown, already used, or expired.
var ErrInvalidResetToken = newValidationError("tautan reset password tidak valid atau sudah kedaluwarsa; minta tautan baru")

type passwordResetConfig struct {
	mailer   Mailer
	linkBase string // frontend origin, e.g. https://example.com
	logLinks bool   // development only: print the link when no mailer is configured
}

// RequestPasswordReset emails a one-time reset link when the address belongs to an account. It never reveals
// whether the email is registered, and the email is sent in the background so timing does not reveal it either.
func (s *accountService) RequestPasswordReset(ctx context.Context, email string) error {
	clean := normalizeEmail(email)
	if validateEmail(clean) != nil {
		return nil
	}
	user, err := s.users.GetByEmail(ctx, clean)
	if err != nil || user == nil {
		return err
	}
	if last, ok, err := s.accounts.LatestPasswordResetAt(ctx, user.ID); err != nil || (ok && s.now().Sub(last) < passwordResetCooldown) {
		return err
	}
	rawToken, tokenHash, err := generateSecureToken()
	if err != nil {
		return err
	}
	if err := s.accounts.CreatePasswordReset(ctx, user.ID, tokenHash, s.now().Add(passwordResetTTL)); err != nil {
		return err
	}
	go s.sendResetEmail(user.Email, user.Name, s.resets.linkBase+"/reset-password?token="+rawToken)
	return nil
}

// ResetPassword redeems a reset token for a new password and signs the account out everywhere.
func (s *accountService) ResetPassword(ctx context.Context, in models.ResetPasswordInput) error {
	if !isWellFormedToken(in.Token) {
		return ErrInvalidResetToken
	}
	if err := validateNewPassword(in.NewPassword, in.ConfirmPassword); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.NewPassword), passwordHashCost)
	if err != nil {
		return fmt.Errorf("error hashing password: %w", err)
	}
	err = s.accounts.RedeemPasswordReset(ctx, HashToken(in.Token), string(hash), s.now())
	if errors.Is(err, repositories.ErrNotFound) {
		return ErrInvalidResetToken
	}
	return err
}

// sendResetEmail delivers the reset link, or logs it in development when no SMTP server is configured.
func (s *accountService) sendResetEmail(to, name, link string) {
	if s.resets.mailer == nil {
		if s.resets.logLinks {
			slog.Info("password reset link (SMTP not configured, development only)", "email", to, "link", link)
		} else {
			slog.Warn("password reset requested but SMTP is not configured; email not sent")
		}
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), resetMailTimeout)
	defer cancel()
	body := fmt.Sprintf("Halo %s,\n\nKami menerima permintaan reset password akun EstateVerse Anda.\n"+
		"Buka tautan berikut dalam 30 menit untuk membuat password baru:\n\n%s\n\n"+
		"Jika Anda tidak meminta reset, abaikan email ini; password Anda tidak berubah.\n\nSalam,\nTim EstateVerse\n", name, link)
	if err := s.resets.mailer.Send(ctx, to, "Reset password EstateVerse", body); err != nil {
		slog.Error("failed sending password reset email", "error", err)
	}
}
