import { API_URL } from './api';
import { useAuthStore } from '../store/authStore';

export type Category = {
  id: string;
  name: string;
  isActive: boolean;
};

async function throwApiError(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const data = (await response.json()) as { message?: unknown };
    if (data?.message != null) {
      message = Array.isArray(data.message)
        ? String(data.message[0] ?? fallback)
        : String(data.message);
    }
  } catch {
    // Non-JSON error body — keep the fallback message.
  }
  throw new Error(message);
}

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().accessToken;

  if (!token) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/** Fetches the categories currently available for voting. */
export async function getActiveCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/categories/active`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    await throwApiError(response, `Error al cargar las categorías (${response.status})`);
  }

  return (await response.json()) as Category[];
}

/** Registers the user's vote for a category in the current voting room. */
export async function voteForRoom(
  roomId: string,
  categoryId: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/tournaments/${encodeURIComponent(roomId)}/vote`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ categoryId }),
    },
  );

  if (!response.ok) {
    await throwApiError(response, `No se pudo registrar tu voto (${response.status})`);
  }
}