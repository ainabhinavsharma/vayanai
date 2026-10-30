import { describe, it, expect } from 'vitest';
import {
  getOrCreateGuestSession,
  saveTripToSession,
  removeTripFromSession,
  deleteGuestSession
} from '@/lib/persistence/sessions';
import { SavedTrip } from '@/types';

describe('Guest Session & Persistence Service', () => {
  const mockTrip: SavedTrip = {
    id: 'meghalaya',
    title: 'Meghalaya, with room to breathe.',
    origin: 'Mumbai',
    duration: 'About 5 days',
    budget: '₹45–75k',
    image: '/images/destinations/meghalaya.jpg',
    updated: new Date().toISOString()
  };

  it('creates an anonymous guest session without personal identifiers', () => {
    const session = getOrCreateGuestSession();
    expect(session.sessionId).toBeDefined();
    expect(session.sessionId).toContain('guest_');
    expect(session.savedTrips).toEqual([]);
  });

  it('saves and updates a trip in the guest session', () => {
    const session = getOrCreateGuestSession('test_session_1');
    const updatedList = saveTripToSession(session.sessionId, mockTrip);

    expect(updatedList.length).toBe(1);
    expect(updatedList[0].id).toBe('meghalaya');
    expect(updatedList[0].origin).toBe('Mumbai');

    // Saving again should update existing item rather than duplicating
    const secondSave = saveTripToSession(session.sessionId, {
      ...mockTrip,
      origin: 'Bengaluru'
    });
    expect(secondSave.length).toBe(1);
    expect(secondSave[0].origin).toBe('Bengaluru');
  });

  it('removes a trip from session', () => {
    const session = getOrCreateGuestSession('test_session_2');
    saveTripToSession(session.sessionId, mockTrip);
    const afterRemoval = removeTripFromSession(session.sessionId, 'meghalaya');
    expect(afterRemoval.length).toBe(0);
  });

  it('completely deletes guest session on request', () => {
    const session = getOrCreateGuestSession('test_session_3');
    saveTripToSession(session.sessionId, mockTrip);
    const deleted = deleteGuestSession('test_session_3');
    expect(deleted).toBe(true);
  });
});
