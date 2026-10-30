import { SavedTrip } from '@/types';

export interface GuestSessionData {
  sessionId: string;
  createdAt: string;
  lastActive: string;
  savedTrips: SavedTrip[];
}

// In-memory server session store (can be backed by Redis / DB in production)
const sessionStore = new Map<string, GuestSessionData>();

export function getOrCreateGuestSession(sessionId?: string): GuestSessionData {
  if (sessionId && sessionStore.has(sessionId)) {
    const session = sessionStore.get(sessionId)!;
    session.lastActive = new Date().toISOString();
    return session;
  }

  const newId = sessionId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newSession: GuestSessionData = {
    sessionId: newId,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    savedTrips: []
  };

  sessionStore.set(newId, newSession);
  return newSession;
}

export function saveTripToSession(sessionId: string, trip: SavedTrip): SavedTrip[] {
  const session = getOrCreateGuestSession(sessionId);
  const existingIndex = session.savedTrips.findIndex((t) => t.id === trip.id);

  if (existingIndex >= 0) {
    session.savedTrips[existingIndex] = {
      ...trip,
      updated: new Date().toISOString()
    };
  } else {
    session.savedTrips.unshift({
      ...trip,
      updated: new Date().toISOString()
    });
  }

  return session.savedTrips;
}

export function removeTripFromSession(sessionId: string, tripId: string): SavedTrip[] {
  const session = getOrCreateGuestSession(sessionId);
  session.savedTrips = session.savedTrips.filter((t) => t.id !== tripId);
  return session.savedTrips;
}

export function deleteGuestSession(sessionId: string): boolean {
  return sessionStore.delete(sessionId);
}
