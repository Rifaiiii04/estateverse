package services

import (
	"context"
	"testing"
	"time"

	"projectfai/backend/internal/models"
)

type mockUserRepo struct {
	usersByID    map[int64]*models.User
	usersByEmail map[string]*models.User
	nextID       int64
}

// Create inserts a user into the mock repository.
func (m *mockUserRepo) Create(ctx context.Context, u *models.User) error {
	m.nextID++
	u.ID = m.nextID
	m.usersByID[u.ID] = u
	m.usersByEmail[u.Email] = u
	return nil
}

// GetByID retrieves a user by ID from the mock.
func (m *mockUserRepo) GetByID(ctx context.Context, id int64) (*models.User, error) {
	return m.usersByID[id], nil
}

// GetByEmail retrieves a user by email from the mock.
func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	return m.usersByEmail[email], nil
}

type mockSessionRepo struct {
	sessions  map[string]*models.Session
	usersByID map[int64]*models.User
	nextID    int64
}

// Create stores a session into the mock repository.
func (m *mockSessionRepo) Create(ctx context.Context, s *models.Session) error {
	m.nextID++
	s.ID = m.nextID
	m.sessions[s.TokenHash] = s
	return nil
}

// GetActiveUser retrieves the user for an active session by token hash.
func (m *mockSessionRepo) GetActiveUser(ctx context.Context, tokenHash string, now time.Time) (*models.User, error) {
	s := m.sessions[tokenHash]
	if s == nil || !s.ExpiresAt.After(now) {
		return nil, nil
	}
	return m.usersByID[s.UserID], nil
}

// DeleteByTokenHash removes a session from the mock repository.
func (m *mockSessionRepo) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	delete(m.sessions, tokenHash)
	return nil
}

// DeleteExpired removes expired sessions.
func (m *mockSessionRepo) DeleteExpired(ctx context.Context, now time.Time) (int64, error) {
	var count int64
	for hash, s := range m.sessions {
		if !s.ExpiresAt.After(now) {
			delete(m.sessions, hash)
			count++
		}
	}
	return count, nil
}

// newTestAuthService creates an AuthService with in-memory mock repositories.
func newTestAuthService() (AuthService, *mockUserRepo, *mockSessionRepo) {
	uRepo := &mockUserRepo{
		usersByID:    make(map[int64]*models.User),
		usersByEmail: make(map[string]*models.User),
	}
	sRepo := &mockSessionRepo{
		sessions:  make(map[string]*models.Session),
		usersByID: uRepo.usersByID,
	}
	svc := NewAuthService(uRepo, sRepo, 24*time.Hour)
	return svc, uRepo, sRepo
}

// TestAuthService_RegisterSuccess verifies standard user registration.
func TestAuthService_RegisterSuccess(t *testing.T) {
	svc, _, _ := newTestAuthService()
	ctx := context.Background()

	input := models.RegisterInput{
		Name:            "Ahmad Fauzi",
		Email:           "Ahmad@EstateVerse.com",
		Password:        "Password123!",
		ConfirmPassword: "Password123!",
	}

	res, err := svc.Register(ctx, input)
	if err != nil {
		t.Fatalf("expected register success, got error: %v", err)
	}
	if res.Email != "ahmad@estateverse.com" {
		t.Errorf("expected normalized email, got %s", res.Email)
	}
	if res.Role != "seller" {
		t.Errorf("expected role seller, got %s", res.Role)
	}
}

// TestAuthService_DuplicateEmail verifies duplicate registrations are blocked.
func TestAuthService_DuplicateEmail(t *testing.T) {
	svc, _, _ := newTestAuthService()
	ctx := context.Background()

	input := models.RegisterInput{
		Name:            "Ahmad Fauzi",
		Email:           "test@estateverse.com",
		Password:        "Password123!",
		ConfirmPassword: "Password123!",
	}

	_, _ = svc.Register(ctx, input)
	_, err := svc.Register(ctx, input)
	if err == nil {
		t.Fatalf("expected duplicate email error, got nil")
	}
}

// TestAuthService_LoginAndSessionLifecycle verifies complete login, session validate, and logout.
func TestAuthService_LoginAndSessionLifecycle(t *testing.T) {
	svc, _, _ := newTestAuthService()
	ctx := context.Background()

	_, _ = svc.Register(ctx, models.RegisterInput{
		Name:            "Budi Santoso",
		Email:           "budi@example.com",
		Password:        "SecurePassword99",
		ConfirmPassword: "SecurePassword99",
	})

	// Wrong password test
	_, _, _, err := svc.Login(ctx, models.LoginInput{
		Email:    "budi@example.com",
		Password: "WrongPassword!",
	})
	if err == nil {
		t.Errorf("expected error on wrong password, got nil")
	}

	// Correct login
	user, token, _, err := svc.Login(ctx, models.LoginInput{
		Email:    "budi@example.com",
		Password: "SecurePassword99",
	})
	if err != nil {
		t.Fatalf("expected login success, got error: %v", err)
	}
	if token == "" {
		t.Fatalf("expected non-empty session token")
	}

	// Validate session
	validatedUser, err := svc.ValidateSession(ctx, token)
	if err != nil {
		t.Fatalf("expected valid session, got error: %v", err)
	}
	if validatedUser.ID != user.ID {
		t.Errorf("expected user ID %d, got %d", user.ID, validatedUser.ID)
	}

	// Logout
	if err := svc.Logout(ctx, token); err != nil {
		t.Fatalf("expected successful logout, got: %v", err)
	}

	// Validate session after logout must fail
	_, err = svc.ValidateSession(ctx, token)
	if err == nil {
		t.Fatalf("expected session invalid after logout, got valid")
	}
}
