import type { AuthUser } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://las-lucas-backend.onrender.com';

export type GoogleSignInResponse = {
  accessToken: string;
  user: AuthUser;
};

/** Validates a Google ID token against the backend and returns a session. */
export async function signInWithGoogle(idToken: string): Promise<GoogleSignInResponse> {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    let message = `Error del servidor (${response.status})`;
    try {
      const data = (await response.json()) as { message?: unknown };
      if (data?.message) {
        message = String(data.message);
      }
    } catch {
      // Non-JSON error body — keep the fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as GoogleSignInResponse;
}

export { API_URL };