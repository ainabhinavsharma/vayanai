'use client';

import React from 'react';

interface OfficialOfferLetterProps {
  candidateName: string;
  candidateEmail: string;
  collegeName?: string;
  trackName: string;
  offerLetterId: string;
  batchStartDate?: string;
  signatureName?: string;
  offerAcceptedAt?: string;
  qrPayloadUrl: string;
}

export function OfficialOfferLetter({
  candidateName,
  candidateEmail,
  collegeName,
  trackName,
  offerLetterId,
  batchStartDate = '02 November 2026',
  signatureName,
  offerAcceptedAt,
  qrPayloadUrl
}: OfficialOfferLetterProps) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Format display start date and compute 3-month end date
  let displayStartDate = batchStartDate;
  let computedEndDate = '02 February 2027';
  try {
    const sDate = new Date(batchStartDate);
    if (!isNaN(sDate.getTime())) {
      displayStartDate = sDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      const eDate = new Date(sDate);
      eDate.setMonth(eDate.getMonth() + 3);
      computedEndDate = eDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
  } catch {
    displayStartDate = batchStartDate;
    computedEndDate = '02 February 2027';
  }

  return (
    <div className="official-offer-letter-wrapper" style={{ width: '100%', maxWidth: '860px', margin: '0 auto', color: '#1a221e' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-offer-letter,
          #printable-offer-letter * {
            visibility: visible !important;
          }
          #printable-offer-letter {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #1a221e !important;
            overflow: visible !important;
          }
          .official-offer-letter-wrapper {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .offer-letter-document {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          table, tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h3, h4 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .no-print, nav, header, footer, button, input, form {
            display: none !important;
          }
        }
      `}} />

      <div
        className="offer-letter-document official-offer-doc"
        id="printable-offer-letter"
      >
        {/* Document Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0e1611', paddingBottom: '18px', marginBottom: '24px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '2.5px', color: '#0e1611', textTransform: 'uppercase' }}>
            VAYANAI
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.2px', color: '#2d3732', marginTop: '4px', textTransform: 'uppercase' }}>
            INTERNSHIP OFFER LETTER
          </div>
          <div style={{ fontSize: '11px', color: '#52615a', fontStyle: 'italic', marginTop: '2px' }}>
            Issued under the internal internship engagement policy of VAYANAI
          </div>
        </div>

        {/* Header Metadata Table */}
        <table className="responsive-doc-table">
          <tbody>
            <tr style={{ borderBottom: '1px solid #d1d9d4' }}>
              <td style={{ padding: '8px 14px', width: '28%', fontWeight: 700, background: '#f8faf9', color: '#4a5550' }}>Reference No.</td>
              <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0e1611' }}>{offerLetterId}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #d1d9d4' }}>
              <td style={{ padding: '8px 14px', fontWeight: 700, background: '#f8faf9', color: '#4a5550' }}>Date of Issue</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}>{currentDate}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #d1d9d4' }}>
              <td style={{ padding: '8px 14px', fontWeight: 700, background: '#f8faf9', color: '#4a5550' }}>Intern Name</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}>
                <strong>{candidateName}</strong> {collegeName ? <span style={{ color: '#52615a', fontSize: '12px' }}>({collegeName})</span> : null}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 14px', fontWeight: 700, background: '#f8faf9', color: '#4a5550' }}>Email Address</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}>{candidateEmail}</td>
            </tr>
          </tbody>
        </table>

        {/* Formal Subject */}
        <div style={{ background: '#f1f5f3', padding: '10px 16px', borderRadius: '4px', borderLeft: '4px solid #0e1611', fontWeight: 700, fontSize: '13.5px', marginBottom: '22px', color: '#0e1611' }}>
          Subject: Offer of Internship — {trackName}
        </div>

        {/* Formal Salutation & Preamble */}
        <p style={{ margin: '0 0 14px' }}>
          Dear <strong>{candidateName}</strong>,
        </p>
        <p style={{ margin: '0 0 14px' }}>
          On behalf of VAYANAI (“VAYANAI,” “the Company,” “we,” or “us”), we're glad to offer you an internship as a <strong>{trackName} Intern</strong> (“you” or “the Intern”). You stood out through the selection process, and we're looking forward to having you contribute in a genuine, project-driven technology environment.
        </p>
        <p style={{ margin: '0 0 14px' }}>
          Think of this as a working, learning-first role. You'll build up your capability, work through the assigned learning activities, and move into live project work as you're ready for it. To be clear: this is not a paid course, it is not a certificate-issuing program, and it is not a guarantee of future employment — please don't understand it as any of those things.
        </p>
        <p style={{ margin: '0 0 24px' }}>
          This letter, together with any policy documents it refers to, sets out the complete terms of your internship. Please read it carefully in full before signing, and if anything is unclear, raise it with Human Resources before you accept.
        </p>

        {/* Section 1 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          1. YOUR INTERNSHIP AT A GLANCE
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', border: '1px solid #d1d9d4', fontSize: '12.5px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, width: '42%', color: '#4a5550', background: '#fafbfa' }}>Internship Period</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}><strong>{displayStartDate} to {computedEndDate}</strong></td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Duration</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}>Three (3) months</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Work Arrangement</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}>Fully remote</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Expected Participation</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}>Approximately 10 hours per week</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Attendance for Stipend Eligibility</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}>Minimum 75% per week</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Fixed Internship Stipend</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}><strong>₹5,000</strong>, subject to the eligibility conditions in Section 6</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Refundable Security Deposit</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}><strong>₹499</strong>, fully refundable subject to Section 5</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Institutional Incubation Fee</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}><strong>₹0 (Fully Sponsored)</strong> &bull; Sponsored by VAYANAI & DBERT Council</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Stipend Disbursement Timeline</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}>Within 3 months of successful completion, per Section 6.4</td>
            </tr>
          </tbody>
        </table>

        {/* Section 2 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          2. VAYANAI AND DBERT
        </h3>
        <p style={{ margin: '0 0 12px' }}>
          VAYANAI currently operates under incubation with DBERT. Under this arrangement, DBERT extends shared support to VAYANAI across training, talent development, technical development, and HR/internship operations.
        </p>
        <p style={{ margin: '0 0 20px' }}>
          Your internship agreement is with VAYANAI alone. Depending on your role and the stage of your internship, elements of your training, HR communication, mentorship, or operational support may be delivered through DBERT's infrastructure. This is meant to give you a structured path from guided learning to practical project contribution, and it does not create any separate contractual relationship between you and DBERT.
        </p>

        {/* Section 3 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          3. WHAT WE EXPECT FROM YOU
        </h3>
        <p style={{ margin: '0 0 20px' }}>
          We look for interns who treat this opportunity with seriousness and intent. You're not expected to arrive with complete mastery of the subject — what we do expect is a willingness to learn, to ask questions, to accept feedback constructively, to meet the commitments you agree to, and to make a genuine effort on the work assigned to you.
        </p>

        {/* Section 4 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          4. LEARNING, DEVELOPMENT AND PROJECT WORK
        </h3>
        <p style={{ margin: '0 0 12px' }}>
          Your internship combines structured learning with practical project work. The exact sequence can vary a little by role, but the intended progression looks like this:
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px', border: '1px solid #d1d9d4', fontSize: '12.5px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 700, width: '28%', background: '#fafbfa', color: '#0e1611' }}>1. Learn</td>
              <td style={{ padding: '8px 14px', color: '#2d3732' }}>Orientation and structured technical learning.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 700, background: '#fafbfa', color: '#0e1611' }}>2. Practise</td>
              <td style={{ padding: '8px 14px', color: '#2d3732' }}>Assignments, exercises, and reviewed feedback.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 700, background: '#fafbfa', color: '#0e1611' }}>3. Contribute</td>
              <td style={{ padding: '8px 14px', color: '#2d3732' }}>Approved work on VAYANAI's own projects, or another assigned live project.</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 14px', fontWeight: 700, background: '#fafbfa', color: '#0e1611' }}>4. Complete</td>
              <td style={{ padding: '8px 14px', color: '#2d3732' }}>Final review, documentation, and exit formalities.</td>
            </tr>
          </tbody>
        </table>

        {/* 4.1 */}
        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0e1611', margin: '16px 0 8px' }}>
          4.1 Training and Development Support
        </h4>
        <p style={{ margin: '0 0 12px' }}>
          Training and development activities may be delivered through DBERT's learning infrastructure, including the Launchpad pathway where it applies to your role. These activities are designed to prepare you for practical contribution, and may cover software development fundamentals, Git/GitHub, AI and automation concepts, APIs, local AI/LLM workflows, and other role-relevant skills.
        </p>
        <div style={{ background: '#f4f7f5', border: '1px solid #c2d4cb', borderLeft: '4px solid #1b5e20', padding: '12px 16px', borderRadius: '4px', margin: '12px 0 16px', fontSize: '13px', fontWeight: 600, color: '#143823', lineHeight: 1.5 }}>
          VAYANAI sponsors the training and development resources used for this internship pathway. You are not required to purchase any course, certification, or resource to obtain or continue this internship, and no one is authorised to ask you to.
        </div>

        {/* 4.2 */}
        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0e1611', margin: '16px 0 8px' }}>
          4.2 Project Allocation
        </h4>
        <p style={{ margin: '0 0 10px' }}>
          Access to live projects is granted based on your readiness, project requirements, security considerations, and the judgement of your assigned mentor or project supervisor. You may begin with guided tasks before you're given access to a live repository, and access to any particular repository or product is never guaranteed.
        </p>
        <p style={{ margin: '0 0 14px' }}>
          Where you're granted access to a live repository or project, you must work strictly within the access controls and review process set up for that project.
        </p>

        {/* 4.3 */}
        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0e1611', margin: '16px 0 8px' }}>
          4.3 What Counts as a Project Contribution
        </h4>
        <p style={{ margin: '0 0 10px' }}>
          For the purpose of the fixed stipend described in Section 6, a qualifying live-repository contribution means a meaningful technical contribution to an assigned project that has been reviewed and formally accepted by your designated mentor or project supervisor. This includes:
        </p>
        <ul style={{ margin: '0 0 12px', paddingLeft: '22px', color: '#2d3732' }}>
          <li style={{ marginBottom: '4px' }}>an accepted or merged feature or pull request;</li>
          <li style={{ marginBottom: '4px' }}>an approved bug fix, or a meaningful and working test contribution;</li>
          <li style={{ marginBottom: '4px' }}>an approved improvement to technical or project documentation; or</li>
          <li style={{ marginBottom: '4px' }}>another substantive contribution accepted in writing by your project supervisor.</li>
        </ul>
        <p style={{ margin: '0 0 14px' }}>
          A commit or pull request is not, by itself, a qualifying contribution merely because it was submitted. It has to be relevant, usable in the project, and formally accepted by the project team.
        </p>

        {/* 4.4 */}
        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0e1611', margin: '16px 0 8px' }}>
          4.4 Attendance and Participation
        </h4>
        <p style={{ margin: '0 0 10px' }}>
          Expected participation is approximately 10 hours per week. To stay eligible for the stipend, you need to maintain at least 75% attendance in each week of the applicable stipend-eligible period. Attendance is tracked through the systems or process communicated to you during onboarding.
        </p>
        <p style={{ margin: '0 0 20px' }}>
          If a genuine academic, medical, or personal circumstance affects your participation, let HR or your mentor know as early as reasonably possible. Unexplained or repeated absence may affect your project access, stipend eligibility, and continuation on the internship.
        </p>

        {/* Section 5 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          5. INTERNSHIP COMMITMENT DEPOSIT
        </h3>
        <p style={{ margin: '0 0 12px' }}>
          Confirming an intern into this pathway creates a real cost for VAYANAI — onboarding, mentor time, tooling, and training resources are all committed from that point forward. To confirm that a selected intern is making a genuine commitment to the opportunity, VAYANAI collects a refundable Internship Commitment Deposit of ₹499 (“the Deposit”) at the time of confirmation.
        </p>
        <div style={{ background: '#f4f7f5', border: '1px solid #c2d4cb', borderLeft: '4px solid #1b5e20', padding: '12px 16px', borderRadius: '4px', margin: '12px 0 16px', fontSize: '13px', fontWeight: 600, color: '#143823', lineHeight: 1.5 }}>
          The ₹499 Deposit is a refundable commitment deposit only. It is not a training fee, course fee, placement fee, or any form of payment for obtaining an internship or employment, and VAYANAI does not charge candidates for the right to work.
        </div>

        {/* 5.1 */}
        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0e1611', margin: '16px 0 8px' }}>
          5.1 How the Deposit Works
        </h4>
        <p style={{ margin: '0 0 8px' }}>
          The Deposit is collected only once you formally confirm the internship and the sponsored internship pathway is activated in your name.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          The Deposit is held separately from any training or program cost. VAYANAI sponsors all training and development resources used on the internship pathway, at no additional cost to you.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          The Deposit becomes refundable once you've successfully completed your applicable internship commitment and the required exit formalities. Refunds are processed within thirty (30) calendar days of completion being confirmed.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          If you voluntarily discontinue the internship, stop participating without communication, or resign before completing the Minimum Commitment Period defined in Section 5.2, the Deposit will ordinarily not be refunded.
        </p>
        <p style={{ margin: '0 0 12px' }}>
          A genuine medical, academic, or personal emergency will be reviewed by HR on its individual facts. Where VAYANAI ends the internship for reasons unrelated to your misconduct or material non-compliance with this letter, the Deposit will ordinarily be refunded in full.
        </p>

        {/* 5.2 */}
        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0e1611', margin: '16px 0 8px' }}>
          5.2 Minimum Commitment and Resignation
        </h4>
        <p style={{ margin: '0 0 10px' }}>
          The Minimum Commitment Period for this internship is forty five (45) calendar days from your date of commencement. You remain free to leave the internship at any time; however, leaving before the Minimum Commitment Period is completed will ordinarily make the Deposit non-refundable, for the reasons set out in Section 5.1.
        </p>
        <p style={{ margin: '0 0 20px' }}>
          If you wish to resign after the Minimum Commitment Period, you're expected to give at least seven (7) calendar days' written notice to HR and to complete the handover and access-closure steps communicated to you. HR may, at its discretion, accept a shorter notice period in appropriate circumstances.
        </p>

        {/* Section 6 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          6. THE ₹5,000 FIXED INTERNSHIP STIPEND
        </h3>
        <p style={{ margin: '0 0 12px' }}>
          The fixed internship stipend of ₹5,000 (“the Stipend”) is earned through verified participation and contribution. It is not a joining payment, a signing bonus, or an amount owed to you simply because this offer has been accepted.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px', border: '1px solid #d1d9d4', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#f1f5f3', borderBottom: '1px solid #d1d9d4' }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#0e1611', width: '32%' }}>Condition</th>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#0e1611' }}>What this means</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Weekly Attendance</td>
              <td style={{ padding: '8px 14px', color: '#2d3732' }}>At least 75% attendance maintained in each week of the applicable stipend-eligible period.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Live Contribution</td>
              <td style={{ padding: '8px 14px', color: '#2d3732' }}>At least one qualifying contribution to an assigned live repository or project, reviewed and accepted (see Section 4.3).</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Completion</td>
              <td style={{ padding: '8px 14px', color: '#2d3732' }}>The applicable internship period and all required exit formalities completed in full.</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Conduct & Compliance</td>
              <td style={{ padding: '8px 14px', color: '#2d3732' }}>Confidentiality, data-security, project, and professional-conduct requirements under this letter followed throughout.</td>
            </tr>
          </tbody>
        </table>

        {/* 6.4 */}
        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0e1611', margin: '16px 0 8px' }}>
          6.4 Disbursement Timeline
        </h4>
        <p style={{ margin: '0 0 20px' }}>
          Once your attendance, contribution, and completion have been verified, the Stipend will be disbursed within 3 months of the successful completion of your internship, via the payment method and process communicated by HR. This verification period allows VAYANAI to confirm attendance records, review the acceptance of your project contribution, and complete exit formalities before disbursement.
        </p>

        {/* Section 7 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          7. YOUR RESPONSIBILITIES
        </h3>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Learning.</strong> Complete assigned training, exercises, assessments, and preparation activities within the agreed timelines.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Project Work.</strong> Complete assigned tasks with care, ask for clarification when you need it, and submit work only through approved channels.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Communication.</strong> Maintain reasonable, responsive communication with your mentor, project supervisor, and HR. Don't disengage without notice.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Security.</strong> Protect your passwords and access credentials, use only approved tools and repositories, keep your device reasonably secure, and report suspected security incidents promptly.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Confidentiality.</strong> Do not share confidential code, documents, credentials, screenshots, customer information, or internal discussions outside approved channels (see Section 8).
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Responsible AI Use.</strong> Use AI tools only where expressly permitted. Never enter confidential or proprietary information into unapproved external AI services, and review all AI-assisted output before submission.
        </p>
        <p style={{ margin: '0 0 20px' }}>
          <strong>Professional Conduct.</strong> Treat colleagues and other participants with respect at all times. See Section 9 (Zero-Tolerance Policy).
        </p>

        {/* Section 8 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          8. CONFIDENTIALITY AND NON-DISCLOSURE
        </h3>
        <p style={{ margin: '0 0 10px' }}>
          In the course of your internship, you may have access to information that is confidential or proprietary to VAYANAI, DBERT, a client, a partner, or another intern or employee (“Confidential Information”). Confidential Information includes, without limitation, source code, technical designs, architecture, product roadmaps, business plans, pricing, customer and user data, internal communications, credentials and access tokens, and any material marked or reasonably understood to be confidential.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          You will use Confidential Information solely to perform your assigned work, and for no other purpose.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          You will not copy, publish, disclose, forward, screenshot, or otherwise share Confidential Information with any person or platform outside VAYANAI's approved channels, including personal social media, public code repositories, forums, or external AI tools.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          This obligation of confidentiality survives the end of your internship for a period of three (3) years, and indefinitely for information that qualifies as a trade secret under applicable law.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          This obligation does not apply to information that is or becomes publicly available through no fault of yours, or that you're required to disclose under a valid legal or regulatory order — provided you notify HR in writing before making any such disclosure, to the extent you're legally permitted to do so.
        </p>
        <p style={{ margin: '0 0 20px' }}>
          By signing this letter, you acknowledge and agree to these confidentiality and non-disclosure obligations as a binding condition of your internship.
        </p>

        {/* Section 9 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          9. ZERO-TOLERANCE POLICY
        </h3>
        <p style={{ margin: '0 0 10px' }}>
          VAYANAI maintains a zero-tolerance approach to conduct that compromises the safety, integrity, or fairness of our workplace, whether in person or online. The following are treated as serious misconduct and may result in immediate termination of your internship, forfeiture of the Deposit, and, where warranted, further legal or regulatory action:
        </p>
        <ul style={{ margin: '0 0 12px', paddingLeft: '22px', color: '#2d3732' }}>
          <li style={{ marginBottom: '4px' }}>harassment, sexual harassment, bullying, or intimidation of any colleague, mentor, intern, or third party;</li>
          <li style={{ marginBottom: '4px' }}>discrimination on the basis of gender, caste, religion, disability, sexual orientation, or any other protected characteristic;</li>
          <li style={{ marginBottom: '4px' }}>fraud, falsification of records, plagiarism, or misrepresentation of your work, attendance, or contributions;</li>
          <li style={{ marginBottom: '4px' }}>unauthorised access to, or misuse of, systems, data, or credentials beyond your assigned scope;</li>
          <li style={{ marginBottom: '4px' }}>sharing or leaking Confidential Information in breach of Section 8; and</li>
          <li style={{ marginBottom: '4px' }}>any other conduct that VAYANAI reasonably determines to be a serious breach of professional or ethical standards.</li>
        </ul>
        <p style={{ margin: '0 0 20px' }}>
          VAYANAI is committed to providing a workplace free of sexual harassment, consistent with the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013. If you experience or witness any form of harassment, you may raise it confidentially with HR or through the Internal Committee, and it will be addressed under VAYANAI's applicable policy.
        </p>

        {/* Section 10 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          10. OWNERSHIP OF INTERNSHIP WORK
        </h3>
        <p style={{ margin: '0 0 20px' }}>
          All work you create specifically for VAYANAI or an assigned project during your internship — including code, documentation, designs, datasets, and other deliverables — is a work made for VAYANAI, and will belong exclusively to VAYANAI or the relevant project owner, as applicable, unless a different arrangement is agreed with you in writing in advance. You assign to VAYANAI all intellectual property rights in such work to the extent they do not already vest in VAYANAI by operation of law. You must not publish, reuse, or repurpose confidential project material — including in a personal portfolio, resume attachment, or public repository — without VAYANAI's prior written permission.
        </p>

        {/* Section 11 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          11. DATA PROTECTION AND PRIVACY
        </h3>
        <p style={{ margin: '0 0 20px' }}>
          VAYANAI collects and processes your personal data (including contact details, attendance records, and performance information) solely to administer this internship, in accordance with applicable data protection law, including the Digital Personal Data Protection Act, 2023. Your data will not be sold or shared with third parties outside VAYANAI and DBERT except where necessary to administer the internship, or where required by law.
        </p>

        {/* Section 12 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          12. CERTIFICATE AND LETTER OF RECOMMENDATION
        </h3>
        <p style={{ margin: '0 0 20px' }}>
          An internship completion certificate may be issued following successful completion of the internship and all required clearances. A Letter of Recommendation may be provided based on your performance, conduct, and organisational policy. Neither document is issued automatically merely because this offer was accepted.
        </p>

        {/* Section 13 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          13. EQUIPMENT AND EXPENSES
        </h3>
        <p style={{ margin: '0 0 20px' }}>
          This is a remote internship. You're expected to arrange your own suitable computer and reliable internet connection, unless VAYANAI confirms otherwise to you in writing. Personal expenses you incur are not reimbursable unless specifically pre-approved by HR in writing.
        </p>

        {/* Section 14 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          14. NATURE OF THE INTERNSHIP
        </h3>
        <p style={{ margin: '0 0 20px' }}>
          This engagement is an internship for learning and project exposure. It does not create an employer–employee relationship, and does not entitle you to the benefits ordinarily associated with employment. It does not guarantee permanent employment, placement, or a future role with VAYANAI, DBERT, or any other organisation. Any future opportunity, if offered, will be considered separately, on its own merits, based on business requirements and your performance during this internship.
        </p>

        {/* Section 15 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          15. GRIEVANCE REDRESSAL, GOVERNING LAW AND DISPUTE RESOLUTION
        </h3>
        <p style={{ margin: '0 0 10px' }}>
          If you have a concern about any aspect of your internship, raise it first with your mentor or project supervisor, and escalate to HR in writing if it remains unresolved. VAYANAI will make a genuine effort to address any concern promptly and fairly.
        </p>
        <p style={{ margin: '0 0 20px' }}>
          This letter is governed by the laws of India. Any dispute arising out of or in connection with this letter that cannot be resolved through good-faith discussion will be subject to the exclusive jurisdiction of the courts at Ghaziabad, India.
        </p>

        {/* Section 16 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          16. GENERAL
        </h3>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Entire agreement.</strong> This letter, together with any policy referenced in it, constitutes the entire agreement between you and VAYANAI regarding this internship, and supersedes any prior discussion or understanding on the subject.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Amendment.</strong> VAYANAI may update the policies referenced in this letter from time to time; any material change affecting your core terms will be communicated to you in writing.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Severability.</strong> If any provision of this letter is found unenforceable, the remaining provisions will continue in full force and effect.
        </p>
        <p style={{ margin: '0 0 24px' }}>
          <strong>No waiver.</strong> VAYANAI's decision not to act on a breach of this letter on one occasion does not waive its right to act on any future breach.
        </p>

        {/* Section 17 */}
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0e1611', borderBottom: '1px solid #d1d9d4', paddingBottom: '6px', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          17. ACCEPTANCE
        </h3>
        <p style={{ margin: '0 0 14px' }}>
          Please sign below to confirm that you have read and understood this offer in full, and that you accept this internship with a genuine intention to participate, learn, and contribute in accordance with its terms.
        </p>

        <table className="responsive-doc-table">
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 700, width: '32%', background: '#fafbfa', color: '#4a5550' }}>Intern Name</td>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0e1611' }}>{candidateName}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 700, background: '#fafbfa', color: '#4a5550' }}>Role / Domain</td>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0e1611' }}>{trackName}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 14px', fontWeight: 700, background: '#fafbfa', color: '#4a5550' }}>Start Date</td>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0e1611' }}>{displayStartDate}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ background: '#f8faf9', border: '1px dashed #718079', borderRadius: '4px', padding: '10px 14px', margin: '14px 0 24px', fontSize: '12px', color: '#4a5550', textAlign: 'center' }}>
          Accept Offer Letter by Responding to the email as <em>“I accept the Offer”</em> or by executing digital acceptance below.
        </div>

        {/* Execution & Signatures Block */}
        <div className="offer-doc-execution-footer">
          {/* Company Signatory */}
          <div>
            <div style={{ fontSize: '12px', color: '#718079', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
              For VAYANAI
            </div>
            <div style={{ height: '46px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '22px', fontWeight: 700, color: '#0e1611' }}>
                Manpreet Kaur
              </span>
            </div>
            <div style={{ fontWeight: 700, color: '#0e1611', fontSize: '13.5px' }}>Manpreet Kaur</div>
            <div style={{ fontSize: '11.5px', color: '#4a5550' }}>HR Head, VAYANAI</div>
            <div style={{ fontSize: '10.5px', color: '#718079' }}>Operations & Incubation Directorate</div>
          </div>

          {/* Cryptographic QR Verification Seal */}
          <div style={{ textAlign: 'center', border: '1px solid #d1d9d4', padding: '10px', borderRadius: '6px', background: '#f8faf9', minWidth: '110px' }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=84x84&data=${encodeURIComponent(qrPayloadUrl)}`}
              alt="Cryptographic QR Verification Seal"
              style={{ width: '76px', height: '76px', display: 'block', margin: '0 auto 4px' }}
            />
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#0e1611', letterSpacing: '0.5px' }}>VERIFIED CREDENTIAL</div>
            <div style={{ fontSize: '8px', fontFamily: 'monospace', color: '#52615a' }}>{offerLetterId}</div>
          </div>

          {/* Candidate Signature Block */}
          <div className="offer-doc-candidate-seal" style={{ minWidth: '240px', textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#718079', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
              Intern Digital Acceptance
            </div>
            {signatureName ? (
              <div>
                <div style={{ height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive, serif", fontSize: '24px', color: '#1b5e20', borderBottom: '1px solid #1b5e20', paddingBottom: '2px' }}>
                    {signatureName}
                  </span>
                </div>
                <div style={{ fontWeight: 700, color: '#0e1611', fontSize: '13.5px' }}>{signatureName}</div>
                <div style={{ fontSize: '10.5px', color: '#1b5e20', fontWeight: 600 }}>
                  Digitally Signed: {offerAcceptedAt ? new Date(offerAcceptedAt).toLocaleString('en-IN') : 'Verified'}
                </div>
              </div>
            ) : (
              <div style={{ height: '74px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#889990', fontStyle: 'italic', fontSize: '12px' }}>
                Pending digital acceptance below (Step 1)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
