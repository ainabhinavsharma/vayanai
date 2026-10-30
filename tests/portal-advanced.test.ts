import { describe, it, expect } from 'vitest';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  getAlignmentQuestions,
  calculateAlignment,
  getJournalEntries,
  addJournalEntry,
  getCohorts,
  requestJoinCohort,
  getLocalImpactLedger
} from '@/lib/portal/portal-service';

describe('Advanced Portal Services', () => {
  describe('Notification Dispatch Center', () => {
    it('retrieves notifications and counts unread items', () => {
      const list = getNotifications();
      expect(list.length).toBeGreaterThanOrEqual(4);

      const unreadCount = getUnreadNotificationCount();
      expect(unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('marks a single notification as read', () => {
      const initialList = getNotifications();
      const unreadItem = initialList.find((n) => !n.isRead);
      if (unreadItem) {
        const updated = markNotificationAsRead(unreadItem.id);
        expect(updated).not.toBeNull();
        expect(updated?.isRead).toBe(true);
      }
    });

    it('marks all notifications as read', () => {
      markAllNotificationsAsRead();
      const unreadCount = getUnreadNotificationCount();
      expect(unreadCount).toBe(0);
    });
  });

  describe('Vayu Alignment Studio & Rhythm Calibration', () => {
    it('returns four structured alignment questions with pacing deltas', () => {
      const questions = getAlignmentQuestions();
      expect(questions.length).toBe(4);
      questions.forEach((q) => {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        q.options.forEach((opt) => {
          expect(typeof opt.pacingDelta).toBe('number');
          expect(opt.rhythmKeyword.length).toBeGreaterThan(0);
        });
      });
    });

    it('calculates alignment score and buffer factor for gentle slow tea pace', () => {
      const answers = {
        'q-daily-rhythm': 'opt-slow-tea',
        'q-road-endurance': 'opt-short-legs',
        'q-culinary-style': 'opt-hearth',
        'q-physical-terrain': 'opt-forest-paths'
      };

      const result = calculateAlignment(answers);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.bufferFactor).toBeGreaterThan(1.0);
      expect(result.rhythmTitle).toContain('Gentle Veranda');
      expect(result.recommendedAdjustments.length).toBeGreaterThanOrEqual(2);
    });

    it('calculates alignment score for active sunrise trekker rhythm', () => {
      const answers = {
        'q-daily-rhythm': 'opt-morning-mist',
        'q-road-endurance': 'opt-moderate-legs',
        'q-culinary-style': 'opt-mild-comfort',
        'q-physical-terrain': 'opt-trekker'
      };

      const result = calculateAlignment(answers);
      expect(result.rhythmTitle).toContain('Dawn Exploratory');
      expect(result.recommendedAdjustments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Travel Journal & Archival Memories', () => {
    it('retrieves initial journal field entries with local interactions', () => {
      const entries = getJournalEntries();
      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(entries[0].title).toBeDefined();
      expect(entries[0].reflection).toBeDefined();
      expect(entries[0].localInteraction).toBeDefined();
    });

    it('adds a new trip memory entry at the top of the collection', () => {
      const countBefore = getJournalEntries().length;
      const created = addJournalEntry({
        day: 3,
        date: 'Autumn Day 3',
        title: 'Veranda Sketching over Canyon mist',
        location: 'Sohra Rim',
        reflection: 'Spent three hours watching cloud shadows roll over the plateau.',
        highlight: 'Fresh wild pepper broth with rice cakes',
        localInteraction: 'Host Banteilang explained Khasi clan forest boundaries',
        photoUrl: '/images/destinations/meghalaya.jpg',
        weatherCondition: '20°C · Mountain Breeze'
      });

      expect(created.id).toBeDefined();
      const listAfter = getJournalEntries();
      expect(listAfter.length).toBe(countBefore + 1);
      expect(listAfter[0].title).toBe('Veranda Sketching over Canyon mist');
    });
  });

  describe('Small-Group Cohorts Directory', () => {
    it('lists small-group departures with seat availability and verified hosts', () => {
      const cohorts = getCohorts();
      expect(cohorts.length).toBeGreaterThanOrEqual(3);
      cohorts.forEach((c) => {
        expect(c.totalSeats).toBeGreaterThanOrEqual(c.availableSeats);
        expect(c.estimatedCostINR).toBeGreaterThan(0);
        expect(c.hostName).toBeDefined();
      });
    });

    it('handles seat reservation inquiry and updates seat counts', () => {
      const cohorts = getCohorts();
      const targetCohort = cohorts.find((c) => c.availableSeats > 0);
      expect(targetCohort).toBeDefined();

      if (targetCohort) {
        const seatsBefore = targetCohort.availableSeats;
        const booked = requestJoinCohort(
          targetCohort.id,
          'Test Traveler',
          'test@example.com',
          'Dietary: Pure vegetarian'
        );

        expect(booked).toBe(true);
        expect(targetCohort.availableSeats).toBe(seatsBefore - 1);
      }
    });
  });

  describe('Local Community Impact & Green Miles Ledger', () => {
    it('returns high local retention for Meghalaya and partner villages', () => {
      const impact = getLocalImpactLedger('meghalaya');
      expect(impact.localSpendRetentionPercent).toBe(88);
      expect(impact.treesOffsetEstimated).toBeGreaterThanOrEqual(10);
      expect(impact.partnerVillagesSupported).toContain('Mawlynnong');
      expect(impact.partnerVillagesSupported).toContain('Sohra');
    });

    it('returns 92% retention for Ladakh high valley homestays', () => {
      const impact = getLocalImpactLedger('ladakh');
      expect(impact.localSpendRetentionPercent).toBe(92);
      expect(impact.partnerVillagesSupported).toContain('Alchi');
    });

    it('returns 86% retention for Kerala waterways', () => {
      const impact = getLocalImpactLedger('kerala');
      expect(impact.localSpendRetentionPercent).toBe(86);
      expect(impact.partnerVillagesSupported).toContain('Kumarakom');
    });
  });
});
