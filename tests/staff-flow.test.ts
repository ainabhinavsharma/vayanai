import { describe, it, expect } from 'vitest';
import {
  getAllStaffLeads,
  createStaffLead,
  updateStaffLeadStage,
  getStaffPlatformMetrics
} from '@/lib/db/staff-repo';
import { getUserByEmail } from '@/lib/db/users-repo';

describe('Staff (BDA) Pipeline & Operations Metrics Engine', () => {
  it('retrieves pre-seeded BDA partner outreach leads', () => {
    const leads = getAllStaffLeads();
    expect(leads.length).toBeGreaterThanOrEqual(2);

    const leadNames = leads.map((l) => l.leadName);
    expect(leadNames.some((name) => name.includes('Cherrapunji') || name.includes('Munro'))).toBe(true);
  });

  it('creates a new partner lead and adds to the BDA pipeline', () => {
    const staff = getUserByEmail('rohit.bda@vayanai.in');
    expect(staff).not.toBeNull();

    const created = createStaffLead({
      bdaUserId: staff!.id,
      leadName: 'Spiti Valley Solar Farmstay Co-op',
      leadType: 'homestay_partner',
      region: 'Himachal Pradesh',
      contactInfo: 'Tsering Dorje · +91 94180 XXXXX',
      pipelineStage: 'outreach',
      estimatedValueINR: 210000,
      notes: 'Pass-insulated dry-toilet earthen homestay at 3,800m altitude.'
    });

    expect(created.id).toBeDefined();
    expect(created.leadName).toBe('Spiti Valley Solar Farmstay Co-op');
    expect(created.pipelineStage).toBe('outreach');

    const allLeads = getAllStaffLeads();
    const found = allLeads.find((l) => l.id === created.id);
    expect(found).toBeDefined();
    expect(found?.estimatedValueINR).toBe(210000);
  });

  it('advances a lead stage through discovery and verified_onboard', () => {
    const leads = getAllStaffLeads();
    const targetLead = leads[0];

    const advancedToDiscovery = updateStaffLeadStage(targetLead.id, 'discovery', 'Site visit completed, verified power backup');
    expect(advancedToDiscovery?.pipelineStage).toBe('discovery');
    expect(advancedToDiscovery?.notes).toContain('Site visit completed');

    const advancedToOnboarded = updateStaffLeadStage(targetLead.id, 'verified_onboard', 'State tourism license validated and badge awarded');
    expect(advancedToOnboarded?.pipelineStage).toBe('verified_onboard');
  });

  it('computes accurate platform-wide metrics for BDA operations', () => {
    const metrics = getStaffPlatformMetrics();

    expect(metrics.activeLeads).toBeGreaterThanOrEqual(1);
    expect(metrics.totalInternCandidates).toBeGreaterThanOrEqual(1);
    expect(typeof metrics.verifiedOnboardedPartners).toBe('number');
    expect(typeof metrics.depositsCollected).toBe('number');
    expect(typeof metrics.totalDepositRevenueINR).toBe('number');
    expect(metrics.totalDepositRevenueINR).toBe(metrics.depositsCollected * 499);
  });
});
