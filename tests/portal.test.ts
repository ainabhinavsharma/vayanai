import { describe, it, expect } from 'vitest';
import {
  getNextStepForTraveler,
  getTravelPass,
  getConversations,
  addMessageToConversation,
  getPartnerInquiries,
  submitPartnerQuote,
  getAdminPartners,
  reviewAdminPartner
} from '@/lib/portal/portal-service';

describe('Portal Traveler Service & Travel Pass', () => {
  it('generates high-altitude next-step action for Ladakh', () => {
    const action = getNextStepForTraveler('ladakh');
    expect(action.badge).toBe('HEALTH & ALTITUDE');
    expect(action.urgency).toBe('high');
    expect(action.title).toContain('Acclimatisation');
  });

  it('generates road pacing next-step action for Meghalaya', () => {
    const action = getNextStepForTraveler('meghalaya');
    expect(action.badge).toBe('ROAD PACING NOTE');
    expect(action.urgency).toBe('medium');
  });

  it('generates a complete, offline-ready Travel Pass', () => {
    const pass = getTravelPass('meghalaya', 'Mumbai');
    expect(pass.passId).toContain('VP-MEGHALAYA');
    expect(pass.itinerarySummary.length).toBe(5);
    expect(pass.packingList.length).toBeGreaterThan(0);
    expect(pass.emergencyContacts.length).toBeGreaterThanOrEqual(3);
    expect(pass.emergencyContacts.some((c) => c.type === 'medical')).toBe(true);
  });
});

describe('Portal Messaging & Threaded Consultation', () => {
  it('loads seeded conversations between travelers and local partners', () => {
    const convs = getConversations();
    expect(convs.length).toBeGreaterThanOrEqual(2);
    expect(convs[0].partnerName).toContain('Sohra');
  });

  it('appends messages to conversation and updates thread state', () => {
    const convs = getConversations();
    const convId = convs[0].id;
    const initialMsgCount = convs[0].messages.length;

    const updated = addMessageToConversation(
      convId,
      'Thank you! We will book the ground floor cottage.',
      'traveler'
    );

    expect(updated).not.toBeNull();
    expect(updated!.messages.length).toBe(initialMsgCount + 1);
    expect(updated!.lastMessageSnippet).toContain('ground floor cottage');
  });
});

describe('Portal Local Partner Quotes & Inquiries', () => {
  it('submits a transparent quote for an incoming traveler brief', () => {
    const inquiries = getPartnerInquiries();
    expect(inquiries.length).toBeGreaterThan(0);

    const inqId = inquiries[0].id;
    const updated = submitPartnerQuote(inqId, 29500, 'All-inclusive 5-night stay with daily farm breakfast');

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('quoted');
    expect(updated!.quoteINR).toBe(29500);
    expect(updated!.quoteNotes).toContain('farm breakfast');
  });
});

describe('Portal Operations & Partner Verification Integrity', () => {
  it('retrieves pending partner applications for human review', () => {
    const partners = getAdminPartners();
    expect(partners.length).toBeGreaterThanOrEqual(3);
    expect(partners.some((p) => p.verificationStatus === 'pending')).toBe(true);
  });

  it('allows operations staff to verify a genuine partner', () => {
    const partners = getAdminPartners();
    const pending = partners.find((p) => p.verificationStatus === 'pending')!;

    const verified = reviewAdminPartner(pending.id, 'verified');
    expect(verified).not.toBeNull();
    expect(verified!.verificationStatus).toBe('verified');
  });

  it('allows operations staff to reject an unverified partner with explicit reason', () => {
    const partners = getAdminPartners();
    const partnerToReject = partners[partners.length - 1];

    const rejected = reviewAdminPartner(partnerToReject.id, 'rejected', 'Missing valid state tourism license');
    expect(rejected).not.toBeNull();
    expect(rejected!.verificationStatus).toBe('rejected');
    expect(rejected!.rejectionReason).toBe('Missing valid state tourism license');
  });
});
