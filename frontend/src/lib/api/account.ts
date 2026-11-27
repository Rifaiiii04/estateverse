import { apiClient } from "./client";
import { User } from "@/types/auth";

type MessageResponse = { message: string };

// Saves a new display name for the signed-in seller and returns the updated profile.
export async function updateProfile(name: string): Promise<User> {
  return apiClient<User>("/account/profile", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

// Replaces the password after the server checks the current one; other devices are signed out.
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<MessageResponse> {
  return apiClient<MessageResponse>("/account/password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
}

// Deletes the seller account with all its listings and files once the password is re-confirmed.
export async function deleteAccount(password: string): Promise<MessageResponse> {
  return apiClient<MessageResponse>("/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}

// Requests a reset link; the server answers the same way whether or not the email is registered.
export async function requestPasswordReset(email: string): Promise<MessageResponse> {
  return apiClient<MessageResponse>("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Redeems a one-time reset token for a new password.
export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<MessageResponse> {
  return apiClient<MessageResponse>("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
}
