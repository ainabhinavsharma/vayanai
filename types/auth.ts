import { PortalRole } from './portal';
export type { PortalRole };

export interface User {
  id: string;
  email: string;
  name: string;
  role: PortalRole;
  phone?: string;
  organization?: string;
  licenseNumber?: string;
  verificationStatus?: 'verified' | 'pending' | 'rejected';
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserWithCredentials extends User {
  passwordHash: string;
  salt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export type InternStatus =
  | 'applied'
  | 'invited'
  | 'interview_in_progress'
  | 'interview_completed'
  | 'selected'
  | 'offer_sent'
  | 'offer_accepted'
  | 'deposit_pending_verification'
  | 'deposit_paid'
  | 'onboarded'
  | 'enrolled'
  | 'completed'
  | 'rejected';

export interface DbertLeadProfile {
  leadPropensity: 'HIGH' | 'MODERATE' | 'LOW';
  urgencyLevel: 'IMMEDIATE' | 'SHORT_TERM' | 'FLEXIBLE';
  financialSupport: 'FAMILY_SPONSORED' | 'SELF_FUNDED' | 'BUDGET_CONSTRAINED';
  priorSpend: 'PREMIUM_COHORTS' | 'MODEST_SELF_PACED' | 'FREE_ONLY';
  counselorPitchGuide: string;
}

export interface ProctoringTelemetry {
  proctoringMode?: 'webcam' | 'camera_free';
  tabSwitchCount: number;
  copyPasteAttempts: number;
  fullscreenExits?: number;
  totalDurationSeconds: number;
  webcamVerified: boolean;
  cameraFreeReason?: string;
  integrityScore: 'CLEAN' | 'FLAGGED_MODERATE' | 'FLAGGED_HIGH';
  flags: string[];
  submittedAt: string;
}

export interface InternApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  phone?: string;
  collegeName?: string;
  semester?: string;
  trackName: string;
  cvUrl?: string;
  status: InternStatus;
  magicToken?: string;
  magicTokenExpiresAt?: string;
  inviteScheduledAt?: string;
  inviteSentAt?: string;
  interviewScore?: number;
  interviewAnswers?: Record<string, string>;
  dbertProfile?: DbertLeadProfile;
  proctoringTelemetry?: ProctoringTelemetry;
  feedbackNote?: string;
  offerLetterId?: string;
  offerSentAt?: string;
  offerAcceptedAt?: string;
  signatureName?: string;
  batchStartDate?: string;
  depositReceipt?: string;
  depositPaidAt?: string;
  utrNumber?: string;
  available3Months?: string;
  laptopInternet?: string;
  placementNeeded?: string;
  sourceReferral?: string;
  appliedAt: string;
  updatedAt: string;
}

export interface InterviewQuestion {
  id: string;
  step: number;
  question: string;
  scenario: string;
  category?: 'technical' | 'profiling';
  options: Array<{
    id: string;
    text: string;
    isOptimal: boolean;
    points: number;
    feedback: string;
  }>;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  productType: 'security_deposit';
  amountINR: number;
  currency: 'INR';
  paymentStatus: 'pending' | 'pending_verification' | 'completed' | 'refunded';
  paymentMethod: 'upi_mock' | 'card_mock' | 'upi_qr' | string;
  transactionRef: string;
  receiptNumber: string;
  createdAt: string;
}

export interface StaffLead {
  id: string;
  bdaUserId: string;
  leadName: string;
  leadType: 'homestay_partner' | 'tour_collective' | 'traveler_group';
  region: string;
  contactInfo: string;
  pipelineStage: 'outreach' | 'discovery' | 'verified_onboard';
  estimatedValueINR?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
