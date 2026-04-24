export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function required(value) {
  return String(value ?? "").trim().length > 0;
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email ?? "").trim());
}

export function normalizeError(error, fallback = "Unerwarteter Fehler") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  return error.message || fallback;
}
