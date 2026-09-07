import { API_URL } from './api';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

export type RoomStatus =
  | 'SCHEDULED'
  | 'WAITING'
  | 'ACTIVE'
  | 'FINISHED'
  | 'CANCELLED';

export type TournamentRoom = {
  id: string;
  tournamentType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'CUSTOM_DATE';
  status: RoomStatus;
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

export type WaitingRoomPlayer = {
  hasPurchasedExtraLife: boolean;
  isEliminated: boolean;
  user: { id: string; name: string; avatarUrl: string | null };
};

export type WaitingRoomData = TournamentRoom & {
  participants: WaitingRoomPlayer[];
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

/** Fetches the unified room + participants payload for the waiting room. */
export async function getWaitingRoom(
  roomId: string,
): Promise<WaitingRoomData> {
  const token = useAuthStore.getState().accessToken;

  if (!token) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  const response = await fetch(
    `${API_URL}/tournaments/${encodeURIComponent(roomId)}/waiting-room`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await throwApiError(response, `Error del servidor (${response.status})`);
  }

  return (await response.json()) as WaitingRoomData;
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

type RoomRealtimeRow = {
  id: string;
  tournament_type: TournamentRoom['tournamentType'];
  status: RoomStatus;
  entry_fee: number;
  extra_life_fee: number;
  prize_pool: number;
  start_time: string;
  max_players: number;
  current_players: number;
  normal_question_count: number;
  normal_question_duration: number;
  survival_question_duration: number;
};

function mapRoomRealtimeRow(row: RoomRealtimeRow): TournamentRoom {
  return {
    id: row.id,
    tournamentType: row.tournament_type,
    status: row.status,
    entryFee: row.entry_fee,
    extraLifeFee: row.extra_life_fee,
    prizePool: row.prize_pool,
    startTime: row.start_time,
    maxPlayers: row.max_players,
    currentPlayers: row.current_players,
    normalQuestionCount: row.normal_question_count,
    normalQuestionDuration: row.normal_question_duration,
    survivalQuestionDuration: row.survival_question_duration,
  };
}

/**
 * Subscribes to live INSERT/UPDATE events on the `rooms` table (Supabase
 * Postgres Realtime). Callback receives the upserted room mapped to the
 * camelCase shape used by the app.
 */
export function subscribeToRoomChanges(
  onUpsert: (room: TournamentRoom) => void,
): () => void {
  const channel = supabase
    .channel('public:rooms')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms' },
      (payload) => {
        onUpsert(mapRoomRealtimeRow(payload.new as RoomRealtimeRow));
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'rooms' },
      (payload) => {
        onUpsert(mapRoomRealtimeRow(payload.new as RoomRealtimeRow));
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to live changes of a single room (e.g. the waiting room).
 * Callback receives the updated room row.
 */
export function subscribeToRoomById(
  roomId: string,
  onUpsert: (room: TournamentRoom) => void,
): () => void {
  const channel = supabase
    .channel(`public:rooms:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        onUpsert(mapRoomRealtimeRow(payload.new as RoomRealtimeRow));
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export type RoomParticipantRealtimeRow = {
  id: string;
  room_id: string;
  user_id: string;
  has_purchased_extra_life: boolean;
  is_eliminated: boolean;
  user_name: string;
  user_avatar_url: string | null;
};

export type RoomParticipantRealtimeEvent = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  participant: WaitingRoomPlayer;
};

function mapRoomParticipantRow(
  row: RoomParticipantRealtimeRow,
): WaitingRoomPlayer {
  return {
    hasPurchasedExtraLife: row.has_purchased_extra_life,
    isEliminated: row.is_eliminated,
    user: {
      id: row.user_id,
      name: row.user_name,
      avatarUrl: row.user_avatar_url,
    },
  };
}

/**
 * Subscribes to INSERT/UPDATE/DELETE events of the `room_participants`
 * table for a given room. Each event carries a self-sufficient snapshot of
 * the participant (profile + flags), so the client can add/update/remove
 * the chip locally without hitting the backend per player.
 */
export function subscribeToRoomParticipants(
  roomId: string,
  onEvent: (event: RoomParticipantRealtimeEvent) => void,
): () => void {
  const channel = supabase
    .channel(`public:room_participants:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as
          | RoomParticipantRealtimeRow
          | undefined;
        if (row) {
          onEvent({
            type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            participant: mapRoomParticipantRow(row),
          });
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}