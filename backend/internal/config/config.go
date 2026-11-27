package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config represents runtime application configuration.
type Config struct {
	Port            string
	AppEnv          string
	DBDSN           string
	FrontendOrigin  string
	SessionTTL      time.Duration
	UploadDir       string
	MaxUploadSizeMB int64
	TrustProxy      bool
	OpenRouterKey   string
	OpenRouterModel string
	SMTP            SMTPSettings
}

// SMTPSettings configures outgoing email (password reset links); an empty host disables email.
type SMTPSettings struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

// Load loads configuration from environment variables and .env file.
func Load() (*Config, error) {
	_ = godotenv.Load(".env", "../.env", "backend/.env")

	port := getEnvOrDefault("PORT", "8080")
	appEnv := getEnvOrDefault("APP_ENV", "development")
	dbDSN := os.Getenv("DB_DSN")
	frontendOrigin := getEnvOrDefault("FRONTEND_ORIGIN", "http://localhost:3000")
	uploadDir := getEnvOrDefault("UPLOAD_DIR", "storage/uploads")

	ttlHours, err := strconv.Atoi(getEnvOrDefault("SESSION_TTL_HOURS", "72"))
	if err != nil || ttlHours <= 0 {
		ttlHours = 72
	}

	maxUploadMB, err := strconv.ParseInt(getEnvOrDefault("MAX_UPLOAD_SIZE_MB", "150"), 10, 64)
	if err != nil || maxUploadMB <= 0 {
		maxUploadMB = 150
	}

	trustProxy := getEnvOrDefault("TRUST_PROXY", "false") == "true"

	cfg := &Config{
		Port:            port,
		AppEnv:          appEnv,
		DBDSN:           dbDSN,
		FrontendOrigin:  frontendOrigin,
		SessionTTL:      time.Duration(ttlHours) * time.Hour,
		UploadDir:       uploadDir,
		MaxUploadSizeMB: maxUploadMB,
		TrustProxy:      trustProxy,
		OpenRouterKey:   os.Getenv("OPENROUTER_API_KEY"),
		OpenRouterModel: os.Getenv("OPENROUTER_MODEL"),
		SMTP: SMTPSettings{
			Host:     os.Getenv("SMTP_HOST"),
			Port:     getEnvOrDefault("SMTP_PORT", "587"),
			Username: os.Getenv("SMTP_USERNAME"),
			Password: os.Getenv("SMTP_PASSWORD"),
			From:     os.Getenv("SMTP_FROM"),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks whether essential configuration parameters are provided.
func (c *Config) Validate() error {
	if c.Port == "" {
		return errors.New("PORT configuration is required")
	}
	if c.DBDSN == "" {
		return errors.New("DB_DSN configuration is required")
	}
	if c.FrontendOrigin == "" {
		return errors.New("FRONTEND_ORIGIN configuration is required")
	}
	return nil
}

// IsProduction returns true if current application environment is production.
func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

// MaxUploadBytes returns the maximum upload size in bytes.
func (c *Config) MaxUploadBytes() int64 {
	return c.MaxUploadSizeMB * 1024 * 1024
}

// getEnvOrDefault returns the value of an environment variable or a fallback default.
func getEnvOrDefault(key, defaultValue string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}
	return val
}

// PrintSafeSummary prints loaded configuration without revealing credentials.
func (c *Config) PrintSafeSummary() string {
	return fmt.Sprintf("env=%s port=%s frontend=%s uploadDir=%s maxMB=%d trustProxy=%t assistantLLM=%t email=%t",
		c.AppEnv, c.Port, c.FrontendOrigin, c.UploadDir, c.MaxUploadSizeMB, c.TrustProxy, c.AssistantEnabled(), c.SMTP.Host != "")
}

// AssistantEnabled reports whether the OpenRouter-backed assistant has credentials and a model configured.
func (c *Config) AssistantEnabled() bool {
	return c.OpenRouterKey != "" && c.OpenRouterModel != ""
}
