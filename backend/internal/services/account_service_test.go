package services

import (
	"context"
	"errors"
	"strings"

	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// fakeAccounts keeps account writes and reset tokens in memory.
type fakeAccounts struct {
	users     *mockUserRepo
	resets    map[string]time.Time // token hash -> expiry
	used      map[string]bool
	lastReset time.Time
	keptHash  string
}

// UpdateName renames the stored user.
func (f *fakeAccounts) UpdateName(_ context.Context, id int64, name string) error {
	f.users.usersByID[id].Name = name
	return nil
}

// UpdatePassword stores the new hash and remembers which session was kept.
func (f *fakeAccounts) UpdatePassword(_ context.Context, id int64, hash, keep string) error {
	f.users.usersByID[id].PasswordHash, f.keptHash = hash, keep
	return nil
}

// DeleteUser removes the stored user.
func (f *fakeAccounts) DeleteUser(_ context.Context, id int64) error {
	delete(f.users.usersByID, id)
	return nil
}

// CreatePasswordReset records a token hash.
func (f *fakeAccounts) CreatePasswordReset(_ context.Context, _ int64, hash string, expires time.Time) error {
	f.resets[hash], f.lastReset = expires, time.Now()
	return nil
}

// LatestPasswordResetAt reports the last reset request.
func (f *fakeAccounts) LatestPasswordResetAt(context.Context, int64) (time.Time, bool, error) {
	return f.lastReset, !f.lastReset.IsZero(), nil
}

// RedeemPasswordReset accepts each unexpired token once and sets the password of user 1.
func (f *fakeAccounts) RedeemPasswordReset(_ context.Context, hash, pw string, now time.Time) error {
	exp, ok := f.resets[hash]
	if !ok || f.used[hash] || !exp.After(now) {
		return repositories.ErrNotFound
	}
	f.used[hash] = true
	f.users.usersByID[1].PasswordHash = pw
	return nil
}

// captureMailer records sent messages.
type captureMailer struct {
	sent chan string
}

// Send forwards the email body to the test.
func (m *captureMailer) Send(_ context.Context, _, _, body string) error {
	m.sent <- body
	return nil
}

// newAccountFixture builds an account service with one user whose password is "lama-password".
func newAccountFixture(t *testing.T) (*accountService, *fakeAccounts, *captureMailer) {
	t.Helper()
	hash, _ := bcrypt.GenerateFromPassword([]byte("lama-password"), bcrypt.MinCost)
	user := &models.User{ID: 1, Name: "Budi", Email: "budi@example.com", PasswordHash: string(hash)}
	users := &mockUserRepo{usersByID: map[int64]*models.User{1: user}, usersByEmail: map[string]*models.User{user.Email: user}}
	accounts := &fakeAccounts{users: users, resets: map[string]time.Time{}, used: map[string]bool{}}
	mailer := &captureMailer{sent: make(chan string, 1)}
	svc := NewAccountService(users, accounts, nil, mailer, "https://site.example", false).(*accountService)
	return svc, accounts, mailer
}

// TestChangePasswordRequiresCurrentPassword covers BUG-28: the old password must be re-entered.
func TestChangePasswordRequiresCurrentPassword(t *testing.T) {
	svc, accounts, _ := newAccountFixture(t)
	ctx := context.Background()
	in := models.ChangePasswordInput{CurrentPassword: "salah", NewPassword: "baru-12345", ConfirmPassword: "baru-12345"}
	if err := svc.ChangePassword(ctx, 1, "tok", in); !errors.Is(err, ErrWrongPassword) {
		t.Fatalf("wrong current password: got %v", err)
	}
	in.CurrentPassword = "lama-password"
	if err := svc.ChangePassword(ctx, 1, "tok", in); err != nil {
		t.Fatalf("valid change rejected: %v", err)
	}
	if accounts.keptHash != HashToken("tok") {
		t.Fatal("current session should be kept while other sessions are signed out")
	}
}

// TestPasswordResetFlow covers BUG-15: unknown emails are silent, the emailed token works once.
func TestPasswordResetFlow(t *testing.T) {
	svc, _, mailer := newAccountFixture(t)
	ctx := context.Background()
	if err := svc.RequestPasswordReset(ctx, "tidak-ada@example.com"); err != nil {
		t.Fatalf("unknown email must not error: %v", err)
	}
	if err := svc.RequestPasswordReset(ctx, "Budi@Example.com"); err != nil {
		t.Fatal(err)
	}
	var body string
	select {
	case body = <-mailer.sent:
	case <-time.After(2 * time.Second):
		t.Fatal("reset email not sent")
	}
	token := body[strings.Index(body, "token=")+len("token=") : strings.Index(body, "token=")+len("token=")+64]
	in := models.ResetPasswordInput{Token: token, NewPassword: "baru-12345", ConfirmPassword: "baru-12345"}
	if err := svc.ResetPassword(ctx, in); err != nil {
		t.Fatalf("valid token rejected: %v", err)
	}
	if err := svc.ResetPassword(ctx, in); !errors.Is(err, ErrInvalidResetToken) {
		t.Fatalf("token reused: got %v", err)
	}
	if err := svc.RequestPasswordReset(ctx, "budi@example.com"); err != nil {
		t.Fatal(err)
	}
	select {
	case <-mailer.sent:
		t.Fatal("second email within the cooldown should be throttled")
	case <-time.After(200 * time.Millisecond):
	}
}
