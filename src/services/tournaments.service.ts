import { API_URL } from './api';
import { useAuthStore } from '../store/authStore';

export type TournamentRoom = {
  id: string;
  tournamentType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'CUSTOM_DATE';
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  entryFee: number;
  extraLifeFee: number;
  prizePool: number;
  startTime: string;
  maxPlayers: number;
  currentPlayers: number;
  normalQuestionCount: number;
  normalQuestionDuration: number;
  survivalQuestionDuration: number;
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

/** Fetches the rooms currently in WAITING status, ordered by start time. */
export async function getTournaments(): Promise<TournamentRoom[]> {
  const token = useAuthStore.getState().accessToken;

  const response = await fetch(`${API_URL}/tournaments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    await throwApiError(response, `Error del servidor (${response.status})`);
  }

  return (await response.json()) as TournamentRoom[];
}

/** Joins a tournament room, optionally purchasing the extra life. */
export async function joinTournament(
  roomId: string,
  buyExtraLife: boolean,
): Promise<TournamentRoom> {
  const token = useAuthStore.getState().accessToken;

  if (!token) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  const response = await fetch(
    `${API_URL}/tournaments/${encodeURIComponent(roomId)}/join`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ buyExtraLife }),
    },
  );

  if (!response.ok) {
    await throwApiError(response, `Error al unirse al torneo (${response.status})`);
  }

  return (await response.json()) as TournamentRoom;
}