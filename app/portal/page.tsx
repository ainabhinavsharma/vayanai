import React from 'react';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  getConversations,
  getTravelPass,
  getPartnerInquiries,
  getAdminPartners,
  getNextStepForTraveler,
  getNotifications,
  getJournalEntries,
  getCohorts,
  getLocalImpactLedger
} from '@/lib/portal/portal-service';

export const metadata = {
  title: 'Vayanai Portal — Trip Command & Network',
  description: 'Multi-role portal for Travelers, Local Hosts, and Network Operations.'
};

export default function PortalPage() {
  const initialConversations = getConversations();
  const initialPass = getTravelPass('meghalaya', 'Mumbai');
  const initialInquiries = getPartnerInquiries();
  const initialPartners = getAdminPartners();
  const initialNextStep = getNextStepForTraveler('meghalaya');
  const initialNotifications = getNotifications();
  const initialJournalEntries = getJournalEntries();
  const initialCohorts = getCohorts();
  const initialImpactLedger = getLocalImpactLedger('meghalaya');

  return (
    <PortalShell
      initialRole="traveler"
      initialConversations={initialConversations}
      initialPass={initialPass}
      initialInquiries={initialInquiries}
      initialPartners={initialPartners}
      initialNextStep={initialNextStep}
      initialNotifications={initialNotifications}
      initialJournalEntries={initialJournalEntries}
      initialCohorts={initialCohorts}
      initialImpactLedger={initialImpactLedger}
    />
  );
}

