export interface Certificate {
  id: string;
  certificateId: string;
  internId: string;
  userId?: string;
  internName: string;
  internEmail: string;
  phone?: string;
  collegeName?: string;
  domain: string;
  topicsCovered: string;
  projectName: string;
  projectDescription?: string;
  projectDeliverables?: string[];
  mentorName: string;
  mentorRole: string;
  mentorEmail?: string;
  joiningDate: string;
  completionDate: string;
  issueDate: string;
  qrPayloadUrl: string;
  status: 'active' | 'revoked' | 'pending_approval' | 'rejected';
  udyamRegNumber?: string;
  issuingAuthority: string;
  paymentProofUrl?: string;
  placementPrep?: string;
  feeINR?: number;
  utrNumber?: string;
  approvedBy?: string;
  approvedAt?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  isSpecimen?: boolean;
}

export interface CertificateVerificationResult {
  isValid: boolean;
  certificate?: Certificate;
  qrDataUrl?: string;
  error?: string;
}

export interface CertificateApplicationRequest {
  name: string;
  email: string;
  phone: string;
  collegeName: string;
  batch: string;
  domain: string;
  projectName: string;
  placementPrep: string;
  utrNumber: string;
  paymentMethod?: string;
  paymentProofUrl?: string;
}

