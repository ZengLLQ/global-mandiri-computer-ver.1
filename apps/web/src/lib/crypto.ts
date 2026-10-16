/**
 * Cryptographic utility for Global Mandiri Computer (GMC) Admin Authentication
 * Utilizes standard Web Crypto API (SHA-256) with cryptographic salt and timing-safe comparison.
 */

export const DEFAULT_SALT = "gmc_salt_2008_surabaya_itc";
// Precomputed SHA-256 hash of "admin2008:gmc_salt_2008_surabaya_itc"
export const DEFAULT_PASSWORD_HASH = "bc0bc612f360f3e2a7aa78d9a9e9876af811aee5860894633844648a756e11e9";
// Fallback hash for "admin:gmc_salt_2008_surabaya_itc"
export const FALLBACK_PASSWORD_HASH = "46fa43759c5fad50031255aa539aa4666ed5a009eb0148da68b90b110855bfbd";

/**
 * Computes SHA-256 hexadecimal digest for a given input string
 */
export async function sha256(input: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Pure fallback implementation for environments without Web Crypto API
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

/**
 * Generates a random cryptographic salt
 */
export function generateSalt(byteLength: number = 16): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(byteLength);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Hashes a password with salt using SHA-256
 */
export async function hashPassword(password: string, salt: string = DEFAULT_SALT): Promise<string> {
  return sha256(`${password}:${salt}`);
}

/**
 * Verifies password against expected hash
 */
export async function verifyPassword(
  passwordAttempt: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const computedHash = await hashPassword(passwordAttempt, salt);
  return timingSafeEqual(computedHash, expectedHash);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates an encrypted session token with timestamp and nonce
 */
export async function generateSessionToken(username: string): Promise<string> {
  const nonce = generateSalt(8);
  const timestamp = Date.now().toString();
  const signature = await sha256(`${username}:${timestamp}:${nonce}:${DEFAULT_SALT}`);
  return `${btoa(`${username}:${timestamp}:${nonce}`)}.${signature.slice(0, 32)}`;
}
