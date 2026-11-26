export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores anything longer, so the server rejects it

// newPasswordProblem explains, in Indonesian, why a new password pair would be rejected, or returns "" when it is fine.
export function newPasswordProblem(password: string, confirm: string): string {
  if ([...password].length < MIN_PASSWORD_LENGTH) return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return "Password terlalu panjang (maksimal 72 byte).";
  if (password !== confirm) return "Konfirmasi password tidak cocok.";
  return "";
}
