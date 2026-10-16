import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SALT,
  DEFAULT_PASSWORD_HASH,
  FALLBACK_PASSWORD_HASH,
  verifyPassword,
  hashPassword,
  generateSalt,
  generateSessionToken,
} from "@/lib/crypto";

export interface AuthState {
  isAuthenticated: boolean;
  adminUsername: string | null;
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  failedAttempts: number;
  lockoutUntil: number | null;
  customSalt: string | null;
  customPasswordHash: string | null;

  // Actions
  login: (
    username: string,
    passwordAttempt: string
  ) => Promise<{ success: boolean; message: string; remainingAttempts?: number; lockoutSeconds?: number }>;
  logout: () => void;
  isSessionValid: () => boolean;
  changePassword: (
    currentPass: string,
    newPass: string
  ) => Promise<{ success: boolean; message: string }>;
  resetLockout: () => void;
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 Seconds lockout

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      adminUsername: null,
      sessionToken: null,
      sessionExpiresAt: null,
      failedAttempts: 0,
      lockoutUntil: null,
      customSalt: null,
      customPasswordHash: null,

      isSessionValid: () => {
        const { isAuthenticated, sessionExpiresAt, sessionToken } = get();
        if (!isAuthenticated || !sessionToken || !sessionExpiresAt) return false;
        if (Date.now() > sessionExpiresAt) {
          // Auto logout expired session
          set({
            isAuthenticated: false,
            sessionToken: null,
            sessionExpiresAt: null,
            adminUsername: null,
          });
          return false;
        }
        return true;
      },

      login: async (username: string, passwordAttempt: string) => {
        const state = get();
        const now = Date.now();

        // 1. Check if user is currently locked out
        if (state.lockoutUntil && now < state.lockoutUntil) {
          const remainingSec = Math.ceil((state.lockoutUntil - now) / 1000);
          return {
            success: false,
            message: `Akses terkunci sementara karena proteksi serangan berulang. Coba lagi dalam ${remainingSec} detik.`,
            lockoutSeconds: remainingSec,
          };
        }

        const normalizedUser = username.trim().toLowerCase();
        const validUsers = ["admin", "gmcadmin", "owner"];

        if (!validUsers.includes(normalizedUser)) {
          const nextAttempts = state.failedAttempts + 1;
          const isLockout = nextAttempts >= MAX_FAILED_ATTEMPTS;
          const lockTime = isLockout ? now + LOCKOUT_DURATION_MS : null;

          set({
            failedAttempts: isLockout ? 0 : nextAttempts,
            lockoutUntil: lockTime,
          });

          return {
            success: false,
            message: "ID Pengguna tidak terdaftar dalam sistem GMC.",
            remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - nextAttempts),
          };
        }

        // 2. Cryptographic password verification
        const activeSalt = state.customSalt || DEFAULT_SALT;
        const targetHash = state.customPasswordHash || DEFAULT_PASSWORD_HASH;

        let isMatch = await verifyPassword(passwordAttempt, activeSalt, targetHash);

        // Also permit fallback standard password if no custom password is set yet
        if (!isMatch && !state.customPasswordHash) {
          isMatch = await verifyPassword(passwordAttempt, DEFAULT_SALT, FALLBACK_PASSWORD_HASH);
        }

        if (!isMatch) {
          const nextAttempts = state.failedAttempts + 1;
          const isLockout = nextAttempts >= MAX_FAILED_ATTEMPTS;
          const lockTime = isLockout ? now + LOCKOUT_DURATION_MS : null;

          set({
            failedAttempts: isLockout ? 0 : nextAttempts,
            lockoutUntil: lockTime,
          });

          return {
            success: false,
            message: isLockout
              ? "Batas percobaan terlampaui. Sistem terkunci selama 60 detik demi keamanan."
              : "Kata sandi salah. Verifikasi kriptografi ditolak.",
            remainingAttempts: isLockout ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - nextAttempts),
            lockoutSeconds: isLockout ? 60 : undefined,
          };
        }

        // 3. Success: generate cryptographic session token
        const token = await generateSessionToken(normalizedUser);
        const expiresAt = now + SESSION_DURATION_MS;

        set({
          isAuthenticated: true,
          adminUsername: normalizedUser,
          sessionToken: token,
          sessionExpiresAt: expiresAt,
          failedAttempts: 0,
          lockoutUntil: null,
        });

        return {
          success: true,
          message: "Autentikasi terenkripsi berhasil. Sesi aman diaktifkan.",
        };
      },

      logout: () => {
        set({
          isAuthenticated: false,
          adminUsername: null,
          sessionToken: null,
          sessionExpiresAt: null,
        });
      },

      changePassword: async (currentPass: string, newPass: string) => {
        const state = get();
        const activeSalt = state.customSalt || DEFAULT_SALT;
        const targetHash = state.customPasswordHash || DEFAULT_PASSWORD_HASH;

        let isMatch = await verifyPassword(currentPass, activeSalt, targetHash);
        if (!isMatch && !state.customPasswordHash) {
          isMatch = await verifyPassword(currentPass, DEFAULT_SALT, FALLBACK_PASSWORD_HASH);
        }

        if (!isMatch) {
          return { success: false, message: "Kata sandi lama tidak sesuai." };
        }

        if (newPass.length < 6) {
          return { success: false, message: "Kata sandi baru minimal 6 karakter." };
        }

        // Generate new salt and hash for new password
        const newSalt = generateSalt(16);
        const newHash = await hashPassword(newPass, newSalt);

        set({
          customSalt: newSalt,
          customPasswordHash: newHash,
        });

        return { success: true, message: "Kata sandi admin berhasil diperbarui dan dienkripsi ulang." };
      },

      resetLockout: () => {
        set({ failedAttempts: 0, lockoutUntil: null });
      },
    }),
    {
      name: "gmc_admin_auth_storage",
    }
  )
);
