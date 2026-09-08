import { create } from 'zustand';
import { getActiveCategories, voteForRoom, type Category } from '../services/categories.service';
import { getWaitingRoom } from '../services/tournaments.service';
import type { ParticipantVoteChange } from '../services/tournaments.service';
import { useAuthStore } from './authStore';

export type RankedCategory = {
  category: Category;
  votes: number;
  lastVotedAtMs: number | null;
  percent: number;
  position: number;
};

type VoteRecord = {
  categoryId: string | null;
  votedAtMs: number | null;
};

type VotingState = {
  roomId: string | null;
  status: 'loading' | 'ready';
  categories: Category[];
  votesByUserId: Record<string, VoteRecord>;
  rankings: RankedCategory[];
  totalVotes: number;
  maxPlayers: number;
  /** rooms.startTime — momento en que cierra la votación (backend: now + 45s). */
  endsAtIso: string | null;
  myVote: VoteRecord;
  isSubmitting: boolean;
  error: string | null;

  init: (roomId: string) => Promise<void>;
  vote: (categoryId: string) => Promise<void>;
  applyVoteDelta: (change: ParticipantVoteChange) => void;
  reset: () => void;
};

const EMPTY_VOTE: VoteRecord = { categoryId: null, votedAtMs: null };

function snapshotVoteRecord(p: {
  votedCategoryId: string | null;
  votedAt: string | null;
}): VoteRecord {
  if (!p.votedCategoryId) {
    return EMPTY_VOTE;
  }
  return {
    categoryId: p.votedCategoryId,
    votedAtMs: p.votedAt ? new Date(p.votedAt).getTime() : null,
  };
}

/**
 * Recalcula el ranking en vivo. Orden estricto en cada re-render:
 * mayor cantidad de votos primero; empate → la categoría cuyo último voto
 * llegó antes (mismo criterio del desempate backend MIN(MAX(votedAt))).
 */
function computeRankings(
  categories: Category[],
  votesByUserId: Record<string, VoteRecord>,
): { rankings: RankedCategory[]; totalVotes: number } {
  const tallies = new Map<string, number>();
  const lastVotedAt = new Map<string, number | null>();

  let totalVotes = 0;

  for (const vote of Object.values(votesByUserId)) {
    if (!vote.categoryId) {
      continue;
    }
    totalVotes += 1;
    tallies.set(vote.categoryId, (tallies.get(vote.categoryId) ?? 0) + 1);
    const prev = lastVotedAt.get(vote.categoryId) ?? null;
    if (prev === null || (vote.votedAtMs !== null && vote.votedAtMs > prev)) {
      lastVotedAt.set(vote.categoryId, vote.votedAtMs);
    }
  }

  const rankings: RankedCategory[] = categories
    .map((category) => {
      const votes = tallies.get(category.id) ?? 0;
      const last = lastVotedAt.get(category.id) ?? null;
      const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      return {
        category,
        votes,
        lastVotedAtMs: last,
        percent,
        position: 0,
      };
    })
    .sort((a, b) => {
      if (a.votes !== b.votes) {
        return b.votes - a.votes;
      }
      const aLast = a.lastVotedAtMs ?? Number.POSITIVE_INFINITY;
      const bLast = b.lastVotedAtMs ?? Number.POSITIVE_INFINITY;
      if (aLast !== bLast) {
        return aLast - bLast;
      }
      return a.category.name.localeCompare(b.category.name);
    })
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  return { rankings, totalVotes };
}

export const useVotingStore = create<VotingState>()((set, get) => ({
  roomId: null,
  status: 'loading',
  categories: [],
  votesByUserId: {},
  rankings: [],
  totalVotes: 0,
  maxPlayers: 0,
  endsAtIso: null,
  myVote: EMPTY_VOTE,
  isSubmitting: false,
  error: null,

  init: async (roomId) => {
    set({ roomId, status: 'loading', error: null, myVote: EMPTY_VOTE });

    try {
      const [categories, waitingRoom] = await Promise.all([
        getActiveCategories(),
        getWaitingRoom(roomId),
      ]);

      const votesByUserId: Record<string, VoteRecord> = {};
      let myVote: VoteRecord = EMPTY_VOTE;
      const myUserId = useAuthStore.getState().user?.id;

      for (const participant of waitingRoom.participants) {
        const record = snapshotVoteRecord(participant);
        votesByUserId[participant.user.id] = record;
        if (participant.user.id === myUserId) {
          myVote = record;
        }
      }

      const { rankings, totalVotes } = computeRankings(categories, votesByUserId);

      set({
        status: 'ready',
        categories,
        votesByUserId,
        rankings,
        totalVotes,
        maxPlayers: waitingRoom.maxPlayers,
        endsAtIso: waitingRoom.startTime,
        myVote,
        error: null,
      });
    } catch (error) {
      set({
        status: 'ready',
        error: error instanceof Error ? error.message : 'No se pudo cargar la votación.',
      });
    }
  },

  vote: async (categoryId) => {
    const roomId = get().roomId;
    if (!roomId || get().isSubmitting || get().myVote.categoryId) {
      return;
    }

    set({ isSubmitting: true, error: null });

    try {
      await voteForRoom(roomId, categoryId);
      // El conteo se actualiza vía el evento Realtime (el propio voto dispara
      // el UPDATE de la fila). Aquí solo adelantamos el estado local del usuario.
      set({ isSubmitting: false, myVote: { categoryId, votedAtMs: Date.now() } });
    } catch (error) {
      set({
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'No se pudo registrar tu voto.',
      });
    }
  },

  applyVoteDelta: (change) => {
    const state = get();
    const current = state.votesByUserId[change.userId] ?? EMPTY_VOTE;

    // El UPDATE puede venir por otra columna (p. ej. score) sin cambio real de voto.
    if (current.categoryId === change.newCategoryId) {
      return;
    }

    const votesByUserId = {
      ...state.votesByUserId,
      [change.userId]: {
        categoryId: change.newCategoryId,
        votedAtMs: change.newVotedAtMs,
      },
    };

    const { rankings, totalVotes } = computeRankings(state.categories, votesByUserId);

    const myUserId = useAuthStore.getState().user?.id;
    const myVote =
      change.userId === myUserId
        ? votesByUserId[change.userId] ?? EMPTY_VOTE
        : state.myVote;

    set({
      votesByUserId,
      rankings,
      totalVotes,
      myVote,
    });
  },

  reset: () => {
    set({
      roomId: null,
      status: 'loading',
      categories: [],
      votesByUserId: {},
      rankings: [],
      totalVotes: 0,
      maxPlayers: 0,
      endsAtIso: null,
      myVote: EMPTY_VOTE,
      isSubmitting: false,
      error: null,
    });
  },
}));