import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCertificateByCertId,
  getCertificateByInternId,
  getCertificatesByEmail,
  getAllCertificates,
  createCertificate,
  generateQRCodeDataUrl,
  getPendingCertificates,
  approveCertificate,
  rejectCertificate
} from '@/lib/db/certificates-repo';

describe('Certificates Database & QR Repository', () => {
  it('retrieves pre-seeded certificates by certificate ID', () => {
    const cert = getCertificateByCertId('CERT-VAY-2026-SO-001');
    expect(cert).not.toBeNull();
    expect(cert?.internName).toBe('Ananya Ghosh');
    expect(cert?.domain).toBe('Sustainable Regional Operations & Growth');
    expect(cert?.mentorName).toBe('Rohit Sen');
    expect(cert?.projectDeliverables?.length).toBeGreaterThan(0);
    expect(cert?.status).toBe('active');
  });

  it('retrieves past batch DBERT certificate by ID case-insensitively', () => {
    const cert = getCertificateByCertId('cert-dbert-2025-ai-014');
    expect(cert).not.toBeNull();
    expect(cert?.internName).toBe('Rahul Kulkarni');
    expect(cert?.domain).toBe('AI Agent Development');
    expect(cert?.mentorName).toBe('Sarita Bansal');
    expect(cert?.projectName).toContain('Alkame');
  });

  it('retrieves certificate by intern ID', () => {
    const cert = getCertificateByInternId('DBERT-INT-TD-8921-022');
    expect(cert).not.toBeNull();
    expect(cert?.internName).toBe('Tanvi Deshmukh');
    expect(cert?.domain).toBe('Python Automation');
  });

  it('generates a valid QR code base64 data URL', async () => {
    const url = 'https://vayanai.in.net/verify?certid=CERT-VAY-2026-SO-001';
    const qrDataUrl = await generateQRCodeDataUrl(url);
    expect(qrDataUrl).toBeDefined();
    expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('creates and retrieves a new issued certificate', () => {
    const testCertId = `CERT-TEST-${Date.now()}-FS`;
    const newCert = createCertificate({
      certificateId: testCertId,
      internId: `VAY-INT-TEST-${Date.now()}`,
      internName: 'Test Candidate',
      internEmail: 'test.candidate@example.com',
      domain: 'Full Stack Development',
      topicsCovered: 'Next.js, TypeScript, SQLite, REST APIs',
      projectName: 'Operations Verification Portal',
      mentorName: 'Rohit Sen',
      mentorRole: 'Senior BDA Lead',
      joiningDate: '01 Feb 2026',
      completionDate: '01 Apr 2026',
      issueDate: '02 Apr 2026',
      qrPayloadUrl: `https://vayanai.in.net/verify?certid=${testCertId}`,
      status: 'active',
      issuingAuthority: 'DBERT Technical Council & Vayanai Operations Platform'
    });

    expect(newCert.id).toBeDefined();
    const fetched = getCertificateByCertId(testCertId);
    expect(fetched).not.toBeNull();
    expect(fetched?.internName).toBe('Test Candidate');
  });

  it('retrieves Excel batch intern (Kushal Agarwal) with college, phone, and project data', () => {
    const cert = getCertificateByCertId('CERT-DBERT-2026-DA-101');
    expect(cert).not.toBeNull();
    expect(cert?.internName).toBe('Kushal Agarwal');
    expect(cert?.collegeName).toBe('Ajeekya dy Patil university');
    expect(cert?.phone).toBe('9503296769');
    expect(cert?.projectName).toBe('Gayatri Ai');
    expect(cert?.feeINR).toBe(299);
    expect(cert?.paymentProofUrl).toContain('drive.google.com');
  });

  it('handles the complete manual admin approval and UTR verification lifecycle', () => {
    const testCertId = `CERT-PENDING-${Date.now()}`;
    const testEmail = `candidate.${Date.now()}@example.com`;
    const testUtr = '428799112233';

    // 1. Candidate submits clearance with UTR
    const created = createCertificate({
      certificateId: testCertId,
      internId: `DBERT-INT-TEST-${Date.now()}`,
      internName: 'Manual Approval Candidate',
      internEmail: testEmail,
      domain: 'Data Analyst',
      topicsCovered: 'Data Cleaning, SQL, Python',
      projectName: 'Gayatri Ai',
      mentorName: 'Sarita Bansal',
      mentorRole: 'Program Head',
      joiningDate: '01 July 2026',
      completionDate: '30 September 2026',
      issueDate: '30 September 2026',
      qrPayloadUrl: `https://vayanai.in.net/verify?certid=${testCertId}`,
      status: 'pending_approval',
      issuingAuthority: 'DBERT Technical Council & Vayanai Operations Platform',
      feeINR: 299,
      utrNumber: testUtr
    });

    expect(created.status).toBe('pending_approval');
    expect(created.utrNumber).toBe(testUtr);

    // 2. Admin retrieves pending queue
    const pending = getPendingCertificates();
    const foundInQueue = pending.find((c) => c.certificateId === testCertId);
    expect(foundInQueue).toBeDefined();
    expect(foundInQueue?.utrNumber).toBe(testUtr);

    // 3. Admin approves payment & certificate
    const approved = approveCertificate(testCertId, 'Operations Head', 'Reconciled with ICICI statement');
    expect(approved).not.toBeNull();
    expect(approved?.status).toBe('active');
    expect(approved?.approvedBy).toBe('Operations Head');
    expect(approved?.approvedAt).toBeDefined();

    // 4. Candidate now has active certificate in their records
    const userCerts = getCertificatesByEmail(testEmail);
    expect(userCerts.length).toBe(1);
    expect(userCerts[0].status).toBe('active');

    // 5. Test rejection flow on another submission
    const rejectCertId = `CERT-REJECT-${Date.now()}`;
    createCertificate({
      certificateId: rejectCertId,
      internId: `DBERT-INT-REJ-${Date.now()}`,
      internName: 'Failed UTR Candidate',
      internEmail: `failed.${Date.now()}@example.com`,
      domain: 'Data Analyst',
      topicsCovered: 'Python',
      projectName: 'Alkame',
      mentorName: 'Sarita Bansal',
      mentorRole: 'Program Head',
      joiningDate: '01 Aug 2026',
      completionDate: '31 Oct 2026',
      issueDate: '31 Oct 2026',
      qrPayloadUrl: `https://vayanai.in.net/verify?certid=${rejectCertId}`,
      status: 'pending_approval',
      issuingAuthority: 'DBERT Technical Council & Vayanai Operations Platform',
      utrNumber: '000000000000'
    });

    const rejected = rejectCertificate(rejectCertId, 'Invalid UTR format');
    expect(rejected?.status).toBe('rejected');
    expect(rejected?.adminNotes).toBe('Invalid UTR format');
  });
});

