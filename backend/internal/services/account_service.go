package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// AccountService lets a signed-in seller manage their account and lets anyone reset a forgotten password.
type AccountService interface {
	UpdateName(ctx context.Context, userID int64, name string) (*models.UserResponse, error)
	ChangePassword(ctx context.Context, userID int64, currentSessionToken string, in models.ChangePasswordInput) error
	DeleteAccount(ctx context.Context, userID int64, password string) error
	RequestPasswordReset(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, in models.ResetPasswordInput) error
}

// ErrWrongPassword means the re-entered current password did not match.
var ErrWrongPassword = newValidationError("password saat ini salah")

type accountService struct {
	users    repositories.UserRepository
	accounts repositories.AccountRepository
	props    PropertyService
	resets   passwordResetConfig
	now      func() time.Time
}

// NewAccountService wires account management; mailer may be nil, in which case reset emails are only logged.
func NewAccountService(users repositories.UserRepository, accounts repositories.AccountRepository, props PropertyService,
	mailer Mailer, resetLinkBase string, logResetLinks bool) AccountService {
	return &accountService{
		users: users, accounts: accounts, props: props, now: time.Now,
		resets: passwordResetConfig{mailer: mailer, linkBase: strings.TrimRight(resetLinkBase, "/"), logLinks: logResetLinks},
	}
}

// UpdateName validates and saves a new display name.
func (s *accountService) UpdateName(ctx context.Context, userID int64, name string) (*models.UserResponse, error) {
	clean := strings.TrimSpace(name)
	if err := validateText("name", clean, minNameRunes, maxNameRunes); err != nil {
		return nil, err
	}
	if err := s.accounts.UpdateName(ctx, userID, clean); err != nil {
		return nil, mapRepoNotFound(err)
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil, mapRepoNotFound(err)
	}
	res := user.ToResponse()
	return &res, nil
}

// ChangePassword verifies the current password, stores the new one, and signs out the seller's other devices.
func (s *accountService) ChangePassword(ctx context.Context, userID int64, currentSessionToken string, in models.ChangePasswordInput) error {
	if _, err := s.verifyPassword(ctx, userID, in.CurrentPassword); err != nil {
		return err
	}
	if err := validateNewPassword(in.NewPassword, in.ConfirmPassword); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.NewPassword), passwordHashCost)
	if err != nil {
		return fmt.Errorf("error hashing password: %w", err)
	}
	return mapRepoNotFound(s.accounts.UpdatePassword(ctx, userID, string(hash), HashToken(currentSessionToken)))
}

// DeleteAccount re-checks the password, deletes every listing (with its files), then removes the user.
func (s *accountService) DeleteAccount(ctx context.Context, userID int64, password string) error {
	if _, err := s.verifyPassword(ctx, userID, password); err != nil {
		return err
	}
	listings, err := s.props.ListOwnerProperties(ctx, userID)
	if err != nil {
		return err
	}
	for _, p := range listings {
		if err := s.props.DeleteProperty(ctx, p.ID, userID); err != nil && !errors.Is(err, ErrNotFound) {
			return err
		}
	}
	return mapRepoNotFound(s.accounts.DeleteUser(ctx, userID))
}

// verifyPassword loads the user and checks a re-entered password against the stored hash.
func (s *accountService) verifyPassword(ctx context.Context, userID int64, password string) (*models.User, error) {
	if password == "" || len(password) > maxPasswordBytes {
		return nil, ErrWrongPassword
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrNotFound
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return nil, ErrWrongPassword
	}
	return user, nil
}

// mapRepoNotFound converts the repository's not-found error into the service sentinel.
func mapRepoNotFound(err error) error {
	if errors.Is(err, repositories.ErrNotFound) {
		return ErrNotFound
	}
	return err
}
