export type PortalRole = 'traveler' | 'partner' | 'admin' | 'staff' | 'intern';

export interface NextStepAction {
  id: string;
  badge: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaAction?: string;
  urgency: 'high' | 'medium' | 'info';
  icon: string;
}

export interface PortalConversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerCategory: string;
  partnerImage: string;
  travelerName: string;
  travelerEmail: string;
  subject: string;
  lastMessageSnippet: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Array<{
    id: string;
    sender: 'traveler' | 'partner' | 'system';
    text: string;
    sentAt: string;
  }>;
}

export interface TravelPassData {
  passId: string;
  tripId: string;
  destination: string;
  duration: string;
  pacing: string;
  dates: string;
  origin: string;
  travellers: string;
  itinerarySummary: Array<{
    day: number;
    title: string;
    focus: string;
    bufferAdvice: string;
  }>;
  packingList: Array<{
    item: string;
    category: 'essentials' | 'clothing' | 'health_safety' | 'documents';
    checked: boolean;
  }>;
  emergencyContacts: Array<{
    title: string;
    contact: string;
    type: 'medical' | 'road_help' | 'local_police';
  }>;
}

export interface PartnerInquiry {
  id: string;
  travelerName: string;
  origin: string;
  destination: string;
  dates: string;
  party: string;
  specialRequests: string[];
  status: 'new' | 'quoted' | 'accepted' | 'declined';
  quoteINR?: number;
  quoteNotes?: string;
  submittedAt: string;
}

export interface AdminPartnerReview {
  id: string;
  name: string;
  category: 'food' | 'outdoors' | 'culture' | 'family';
  region: string;
  contactPerson: string;
  phone: string;
  licenseNumber: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
}

export interface PortalNotification {
  id: string;
  category: 'transit' | 'weather' | 'host' | 'pacing';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  urgency: 'info' | 'warning' | 'critical';
  actionTab?: string;
  actionText?: string;
}

export interface AlignmentQuestionOption {
  id: string;
  label: string;
  description: string;
  pacingDelta: number; // positive = slower/more buffer, negative = brisk
  rhythmKeyword: string;
}

export interface AlignmentQuestion {
  id: string;
  step: number;
  question: string;
  subtitle: string;
  options: AlignmentQuestionOption[];
}

export interface VayuAlignmentScore {
  score: number; // 0 - 100%
  rhythmTitle: string;
  pacingSummary: string;
  bufferFactor: number; // multiplier for road buffers
  recommendedAdjustments: string[];
  recalibratedAt: string;
}

export interface TravelJournalEntry {
  id: string;
  day: number;
  date: string;
  title: string;
  location: string;
  reflection: string;
  highlight: string;
  localInteraction: string;
  photoUrl?: string;
  weatherCondition?: string;
}

export interface TravelCohort {
  id: string;
  destination: string;
  routeKey: string;
  title: string;
  dates: string;
  groupSize: string;
  totalSeats: number;
  availableSeats: number;
  hostName: string;
  hostCategory: string;
  hostImage: string;
  focus: string;
  estimatedCostINR: number;
  highlights: string[];
  status: 'open' | 'almost_full' | 'waitlist';
}

export interface LocalImpactLedger {
  routeKey: string;
  destinationName: string;
  localSpendRetentionPercent: number; // e.g. 88%
  treesOffsetEstimated: number; // e.g. 14 trees
  plasticAvoidedKg: number; // e.g. 18 kg
  partnerVillagesSupported: string[];
  communityPledge: string;
}
