package models

// UpdateProfileInput holds the editable profile fields of the signed-in seller.
type UpdateProfileInput struct {
	Name string `json:"name"`
}

// ChangePasswordInput holds the current password and the new password chosen in account settings.
type ChangePasswordInput struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

// DeleteAccountInput re-confirms the password before an account and all its listings are removed.
type DeleteAccountInput struct {
	Password string `json:"password"`
}

// ForgotPasswordInput starts a password reset for an email address.
type ForgotPasswordInput struct {
	Email string `json:"email"`
}

// ResetPasswordInput redeems a one-time reset token for a new password.
type ResetPasswordInput struct {
	Token           string `json:"token"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}
