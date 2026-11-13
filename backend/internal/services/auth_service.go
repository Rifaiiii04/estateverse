package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// passwordHashCost balances brute-force resistance against login latency.
const passwordHashCost = 12

// AuthService defines business logic for registration, authentication, and sessions.
type AuthService interface {
	Register(ctx context.Context, input models.RegisterInput) (*models.UserResponse, error)
	Login(ctx context.Context, input models.LoginInput) (*models.UserResponse, string, time.Time, error)
	ValidateSession(ctx context.Context, rawToken string) (*models.User, error)
	Logout(ctx context.Context, rawToken string) error
	PurgeExpiredSessions(ctx context.Context) (int64, error)
}

type authService struct {
	userRepo    repositories.UserRepository
	sessionRepo repositories.SessionRepository
	sessionTTL  time.Duration
	dummyHash   []byte
}

// NewAuthService instantiates the authentication service.
func NewAuthService(
	uRepo repositories.UserRepository,
	sRepo repositories.SessionRepository,
	ttl time.Duration,
) AuthService {
	// A throwaway hash keeps login timing identical whether or not the email exists.
	dummy, _ := bcrypt.GenerateFromPassword([]byte("estateverse-timing-guard"), passwordHashCost)
	return &authService{
		userRepo:    uRepo,
		sessionRepo: sRepo,
		sessionTTL:  ttl,
		dummyHash:   dummy,
	}
}

// Register validates user input, hashes credentials, and creates a new seller.
func (s *authService) Register(ctx context.Context, input models.RegisterInput) (*models.UserResponse, error) {
	name := strings.TrimSpace(input.Name)
	email := normalizeEmail(input.Email)

	if err := validateRegisterInput(name, email, input.Password, input.ConfirmPassword); err != nil {
		return nil, err
	}

	existing, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("error checking existing email: %w", err)
	}
	if existing != nil {
		return nil, ErrConflict
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), passwordHashCost)
	if err != nil {
		return nil, fmt.Errorf("error hashing password: %w", err)
	}

	// Role is always assigned server-side; clients can never choose it.
	user := &models.User{Name: name, Email: email, PasswordHash: string(hash), Role: models.RoleSeller}
	if err := s.userRepo.Create(ctx, user); err != nil {
		if errors.Is(err, repositories.ErrDuplicate) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("failed to save user: %w", err)
	}

	user.CreatedAt = time.Now()
	res := user.ToResponse()
	return &res, nil
}

// Login verifies credentials and issues a cryptographically secure session.
func (s *authService) Login(ctx context.Context, input models.LoginInput) (*models.UserResponse, string, time.Time, error) {
	email := normalizeEmail(input.Email)
	if email == "" || input.Password == "" || len(email) > maxEmailBytes || len(input.Password) > maxPasswordBytes {
		return nil, "", time.Time{}, ErrInvalidCredentials
	}

	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, "", time.Time{}, fmt.Errorf("database lookup error: %w", err)
	}
	if user == nil {
		_ = bcrypt.CompareHashAndPassword(s.dummyHash, []byte(input.Password))
		return nil, "", time.Time{}, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, "", time.Time{}, ErrInvalidCredentials
	}

	rawToken, tokenHash, err := generateSecureToken()
	if err != nil {
		return nil, "", time.Time{}, err
	}

	expiresAt := time.Now().Add(s.sessionTTL)
	session := &models.Session{UserID: user.ID, TokenHash: tokenHash, ExpiresAt: expiresAt}
	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, "", time.Time{}, fmt.Errorf("failed creating session: %w", err)
	}

	res := user.ToResponse()
	return &res, rawToken, expiresAt, nil
}

// ValidateSession verifies token authenticity and returns the active user.
func (s *authService) ValidateSession(ctx context.Context, rawToken string) (*models.User, error) {
	if !isWellFormedToken(rawToken) {
		return nil, ErrUnauthenticated
	}

	user, err := s.sessionRepo.GetActiveUser(ctx, HashToken(rawToken), time.Now())
	if err != nil {
		return nil, fmt.Errorf("failed looking up session: %w", err)
	}
	if user == nil {
		return nil, ErrUnauthenticated
	}
	return user, nil
}

// Logout removes an active session by invalidating its hashed token in the database.
func (s *authService) Logout(ctx context.Context, rawToken string) error {
	if !isWellFormedToken(rawToken) {
		return nil
	}
	return s.sessionRepo.DeleteByTokenHash(ctx, HashToken(rawToken))
}

// PurgeExpiredSessions deletes expired sessions so the table stays small and fast.
func (s *authService) PurgeExpiredSessions(ctx context.Context) (int64, error) {
	return s.sessionRepo.DeleteExpired(ctx, time.Now())
}

// generateSecureToken creates a 32-byte cryptographically secure random token and its sha256 hash.
func generateSecureToken() (string, string, error) {
	buf := make([]byte, sessionTokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("failed to generate random token: %w", err)
	}
	raw := hex.EncodeToString(buf)
	return raw, HashToken(raw), nil
}

// HashToken calculates the SHA-256 hexadecimal hash of a raw token string.
func HashToken(rawToken string) string {
	h := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(h[:])
}
