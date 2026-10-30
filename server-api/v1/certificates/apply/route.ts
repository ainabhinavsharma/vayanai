import { NextRequest, NextResponse } from 'next/server';
import { createCertificate, generateQRCodeDataUrl } from '@/lib/db/certificates-repo';
import { getDb } from '@/lib/db/sqlite';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      collegeName,
      batch,
      domain,
      projectName,
      placementPrep,
      utrNumber,
      paymentMethod,
      paymentProofUrl
    } = body;

    if (!name || !email || !domain || !projectName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please fill in all required fields (Name, Email, Domain, Project).'
        },
        { status: 400 }
      );
    }

    if (!utrNumber || utrNumber.trim().length < 4) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid 12-digit UPI UTR / Transaction Reference number.'
        },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const initials = (name || '')
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('') || 'INT';

    const userEmailPrefix = email.split('@')[0] || '';
    const last4 = userEmailPrefix.slice(-4) || '0000';

    const randomSerial = Math.floor(100 + Math.random() * 900);
    const isOps = domain.includes('Operations') || domain.includes('Tourism');
    const prefix = isOps ? 'VAY' : 'DBERT';

    const internId = `${prefix}-INT-${initials}-${last4}-${randomSerial}`.toUpperCase();

    const code = domain
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('') || 'AI';

    const certificateId = `CERT-${prefix}-${currentYear}-${code}-${randomSerial}`.toUpperCase();
    const verificationUrl = `https://vayanai.in.net/verify?certid=${certificateId}`;

    // Dates from batch
    const now = new Date();
    let joinDateStr = '01 August 2026';
    let endDateStr = '31 October 2026';

    const batchLower = (batch || '').toLowerCase();
    if (batchLower.includes('july to sep') || batchLower.includes('jul to sep')) {
      joinDateStr = '01 July 2026';
      endDateStr = '30 September 2026';
    } else if (batchLower.includes('june to aug') || batchLower.includes('jun to aug')) {
      joinDateStr = '01 June 2026';
      endDateStr = '31 August 2026';
    } else if (batchLower.includes('may to july') || batchLower.includes('may to jul')) {
      joinDateStr = '01 May 2026';
      endDateStr = '31 July 2026';
    }

    // Mentor
    const isRohit = domain.includes('Full Stack') || domain.includes('Operations');
    const mentorName = isRohit ? 'Rohit Sen' : 'Sarita Bansal';
    const mentorRole = isRohit
      ? 'Senior BDA Lead & Technical Advisor'
      : 'Program Head, DBERT Technical Council';
    const mentorEmail = isRohit ? 'rohit.bda@vayanai.in' : 'sarita.bansal@dbert.online';

    // Topics mapping
    const topicsMapping: Record<string, string> = {
      'Python Automation':
        'Python Programming, Automation Scripts, File Handling, Batch CSV Processing, REST APIs, Task Scheduling',
      'AI Agent Development':
        'Prompt Engineering, AI Agents, RAG Pipelines, LangChain, Multi-Agent Workflows, Grounded Citation Verification',
      'Artificial Intelligence (AI) and Machine Learning (ML)':
        'Prompt Engineering, AI Agents, Machine Learning Models, Neural Networks, LangChain, API Pipelines',
      'Full Stack Development':
        'TypeScript, React, Next.js, REST APIs, SQLite Persistence, Component Styling, Authentication Workflows',
      'Data Analyst':
        'Excel, SQL, Python, Pandas, Data Cleaning, Visualization, Power BI, Economic Direct-Spend Modeling',
      'Sustainable Regional Operations & Growth':
        'Homestay Auditing, Pacing Protocols, Partner Integrity, Direct-Spend Retention Metrics, Regional Transport Logistics'
    };
    const topicsCovered = topicsMapping[domain] || 'Technical Engineering, System Architecture, Quality Verification';

    // 1. Ensure user exists in users table
    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as { id: string } | undefined;
    let userId = existingUser?.id;

    if (!userId) {
      userId = `usr-intern-${Date.now()}`;
      try {
        db.prepare(`
          INSERT INTO users (
            id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          cleanEmail,
          'intern_certificate_guest_account',
          'salt_intern',
          name.trim(),
          'intern',
          phone ? phone.trim() : null,
          'approved',
          now.toISOString(),
          now.toISOString()
        );
      } catch (userErr) {
        console.warn('User auto-creation non-fatal:', userErr);
      }
    }

    const cleanUtr = utrNumber.trim();
    const receiptNumber = `VP-UPI-299-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Create certificate in database with pending_approval status
    const newCert = createCertificate({
      certificateId,
      internId,
      userId: userId || undefined,
      internName: name.trim(),
      internEmail: cleanEmail,
      phone: phone ? phone.trim() : undefined,
      collegeName: collegeName ? collegeName.trim() : undefined,
      domain: domain.trim(),
      topicsCovered,
      projectName: projectName.trim(),
      projectDescription: `Applied engineering milestone on ${projectName.trim()} for ${batch || '2026 Cohort'}. Institution: ${collegeName || 'Verified University'}.`,
      projectDeliverables: [
        `Completed applied project on ${projectName.trim()}`,
        `Academic verification from ${collegeName || 'Verified University'}`,
        `Formal endorsement by ${mentorName}`
      ],
      mentorName,
      mentorRole,
      mentorEmail,
      joiningDate: joinDateStr,
      completionDate: endDateStr,
      issueDate: endDateStr,
      qrPayloadUrl: verificationUrl,
      status: 'pending_approval',
      udyamRegNumber: 'UDYAM-UP-29-0109046',
      issuingAuthority: 'DBERT Technical Council & Vayanai Operations Platform',
      paymentProofUrl: paymentProofUrl || `UPI_UTR_${cleanUtr}`,
      placementPrep: placementPrep || 'No, I’m only interested in the Certificate & LOR.',
      feeINR: 299,
      utrNumber: cleanUtr
    });

    // 3. Record pending payment in payments table
    const paymentId = `pay-${Date.now()}`;

    if (userId) {
      try {
        db.prepare(`
          INSERT INTO payments (
            id, user_id, user_email, user_name, product_type, amount_inr,
            currency, payment_status, payment_method, transaction_ref, receipt_number, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          paymentId,
          userId,
          cleanEmail,
          name.trim(),
          'security_deposit',
          299,
          'INR',
          'pending_verification',
          paymentMethod || 'upi_qr',
          cleanUtr,
          receiptNumber,
          now.toISOString()
        );
      } catch (payErr) {
        console.warn('Payment record log non-fatal:', payErr);
      }
    }

    // 4. Generate QR code Data URL
    const qrDataUrl = await generateQRCodeDataUrl(verificationUrl);

    return NextResponse.json({
      success: true,
      data: {
        certificate: newCert,
        qrDataUrl,
        receiptNumber,
        verificationUrl,
        downloadUrl: `/verify?certid=${certificateId}`,
        requiresAdminApproval: true,
        message: `Application and UPI payment proof (UTR: ${cleanUtr}) submitted successfully. Your certificate is under manual admin review and will be activated once verified.`
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in certificate application & payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process certificate application and payment.' },
      { status: 500 }
    );
  }
}
