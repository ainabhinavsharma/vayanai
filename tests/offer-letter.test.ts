import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { OfficialOfferLetter } from '../components/intern/OfficialOfferLetter';

describe('Official Legal Offer Letter Contract Verbatim Coverage', () => {
  const sampleProps = {
    candidateName: 'Rohit Verma',
    candidateEmail: 'rohit.verma@example.com',
    collegeName: 'Delhi Technological University',
    trackName: 'Data Analyst',
    offerLetterId: 'VY-OFFER-2026-9041',
    batchStartDate: '02 November 2026',
    signatureName: 'Rohit Verma',
    offerAcceptedAt: '2026-10-25T10:00:00.000Z',
    qrPayloadUrl: 'http://localhost:3000/intern/offer?token=test-interview-2026'
  };

  const renderedHtml = renderToString(React.createElement(OfficialOfferLetter, sampleProps));

  it('renders header, metadata table, and intro accurately with placeholders', () => {
    expect(renderedHtml).toContain('VAYANAI');
    expect(renderedHtml).toContain('INTERNSHIP OFFER LETTER');
    expect(renderedHtml).toContain('Issued under the internal internship engagement policy of VAYANAI');
    expect(renderedHtml).toContain('VY-OFFER-2026-9041');
    expect(renderedHtml).toContain('Rohit Verma');
    expect(renderedHtml).toContain('rohit.verma@example.com');
    expect(renderedHtml).toContain('Delhi Technological University');
    expect(renderedHtml).toContain('Offer of Internship');
    expect(renderedHtml).toContain('Data Analyst');
    expect(renderedHtml).toContain('Think of this as a working, learning-first role.');
    expect(renderedHtml).toContain('this is not a paid course, it is not a certificate-issuing program, and it is not a guarantee of future employment');
  });

  it('renders Section 1: YOUR INTERNSHIP AT A GLANCE with all 8 parameters', () => {
    expect(renderedHtml).toContain('1. YOUR INTERNSHIP AT A GLANCE');
    expect(renderedHtml).toContain('02 November 2026');
    expect(renderedHtml).toContain('February 2027');
    expect(renderedHtml).toContain('Two (3) months');
    expect(renderedHtml).toContain('Fully remote');
    expect(renderedHtml).toContain('Approximately 10 hours per week');
    expect(renderedHtml).toContain('Minimum 75% per week');
    expect(renderedHtml).toContain('₹5,000');
    expect(renderedHtml).toContain('subject to the eligibility conditions in Section 6');
    expect(renderedHtml).toContain('₹499');
    expect(renderedHtml).toContain('fully refundable subject to Section 5');
    expect(renderedHtml).toContain('Within 3 months of successful completion, per Section 6.4');
  });

  it('renders Section 2: VAYANAI AND DBERT incubation relationship and Section 3: EXPECTATIONS', () => {
    expect(renderedHtml).toContain('2. VAYANAI AND DBERT');
    expect(renderedHtml).toContain('VAYANAI currently operates under incubation with DBERT');
    expect(renderedHtml).toContain('does not create any separate contractual relationship between you and DBERT');
    expect(renderedHtml).toContain('3. WHAT WE EXPECT FROM YOU');
    expect(renderedHtml).toContain('willingness to learn, to ask questions, to accept feedback constructively');
  });

  it('renders Section 4: LEARNING, DEVELOPMENT AND PROJECT WORK with 4-stage progression and subclauses 4.1-4.4', () => {
    expect(renderedHtml).toContain('4. LEARNING, DEVELOPMENT AND PROJECT WORK');
    expect(renderedHtml).toContain('1. Learn');
    expect(renderedHtml).toContain('2. Practise');
    expect(renderedHtml).toContain('3. Contribute');
    expect(renderedHtml).toContain('4. Complete');

    // 4.1 and Statutory Training Disclaimer Callout Box
    expect(renderedHtml).toContain('4.1 Training and Development Support');
    expect(renderedHtml).toContain('VAYANAI sponsors the training and development resources used for this internship pathway');
    expect(renderedHtml).toContain('You are not required to purchase any course, certification, or resource to obtain or continue this internship');

    // 4.2 Project Allocation
    expect(renderedHtml).toContain('4.2 Project Allocation');
    expect(renderedHtml).toContain('Access to live projects is granted based on your readiness');

    // 4.3 Qualifying Contribution
    expect(renderedHtml).toContain('4.3 What Counts as a Project Contribution');
    expect(renderedHtml).toContain('an accepted or merged feature or pull request;');
    expect(renderedHtml).toContain('an approved bug fix, or a meaningful and working test contribution;');
    expect(renderedHtml).toContain('an approved improvement to technical or project documentation; or');

    // 4.4 Attendance and Participation
    expect(renderedHtml).toContain('4.4 Attendance and Participation');
    expect(renderedHtml).toContain('maintain at least 75% attendance in each week');
  });

  it('renders Section 5: COMMITMENT DEPOSIT with callout and sections 5.1 & 5.2', () => {
    expect(renderedHtml).toContain('5. INTERNSHIP COMMITMENT DEPOSIT');
    expect(renderedHtml).toContain('The ₹499 Deposit is a refundable commitment deposit only');
    expect(renderedHtml).toContain('It is not a training fee, course fee, placement fee, or any form of payment for obtaining an internship');
    expect(renderedHtml).toContain('5.1 How the Deposit Works');
    expect(renderedHtml).toContain('Refunds are processed within thirty (30) calendar days of completion being confirmed');
    expect(renderedHtml).toContain('5.2 Minimum Commitment and Resignation');
    expect(renderedHtml).toContain('forty five (45) calendar days from your date of commencement');
    expect(renderedHtml).toContain('at least seven (7) calendar days&#x27; written notice to HR');
  });

  it('renders Section 6: STIPEND with condition table and Section 6.4 disbursement', () => {
    expect(renderedHtml).toContain('6. THE ₹5,000 FIXED INTERNSHIP STIPEND');
    expect(renderedHtml).toContain('Weekly Attendance');
    expect(renderedHtml).toContain('Live Contribution');
    expect(renderedHtml).toContain('Conduct &amp; Compliance');
    expect(renderedHtml).toContain('6.4 Disbursement Timeline');
    expect(renderedHtml).toContain('disbursed within 3 months of the successful completion of your internship');
  });

  it('renders Section 7 to 16 full legal clauses without truncation', () => {
    // Section 7
    expect(renderedHtml).toContain('7. YOUR RESPONSIBILITIES');
    expect(renderedHtml).toContain('Responsible AI Use.');

    // Section 8
    expect(renderedHtml).toContain('8. CONFIDENTIALITY AND NON-DISCLOSURE');
    expect(renderedHtml).toContain('survives the end of your internship for a period of three (3) years');

    // Section 9
    expect(renderedHtml).toContain('9. ZERO-TOLERANCE POLICY');
    expect(renderedHtml).toContain('Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013');

    // Section 10
    expect(renderedHtml).toContain('10. OWNERSHIP OF INTERNSHIP WORK');
    expect(renderedHtml).toContain('work made for VAYANAI, and will belong exclusively to VAYANAI');

    // Section 11
    expect(renderedHtml).toContain('11. DATA PROTECTION AND PRIVACY');
    expect(renderedHtml).toContain('Digital Personal Data Protection Act, 2023');

    // Section 12
    expect(renderedHtml).toContain('12. CERTIFICATE AND LETTER OF RECOMMENDATION');

    // Section 13
    expect(renderedHtml).toContain('13. EQUIPMENT AND EXPENSES');

    // Section 14
    expect(renderedHtml).toContain('14. NATURE OF THE INTERNSHIP');
    expect(renderedHtml).toContain('does not create an employer–employee relationship');

    // Section 15
    expect(renderedHtml).toContain('15. GRIEVANCE REDRESSAL, GOVERNING LAW AND DISPUTE RESOLUTION');
    expect(renderedHtml).toContain('exclusive jurisdiction of the courts at Ghaziabad, India');

    // Section 16
    expect(renderedHtml).toContain('16. GENERAL');
    expect(renderedHtml).toContain('Entire agreement.');
    expect(renderedHtml).toContain('Severability.');
    expect(renderedHtml).toContain('No waiver.');
  });

  it('renders Section 17: ACCEPTANCE with table, signatories, and QR verification seal', () => {
    expect(renderedHtml).toContain('17. ACCEPTANCE');
    expect(renderedHtml).toContain('Accept Offer Letter by Responding to the email as');
    expect(renderedHtml).toContain('Manpreet Kaur');
    expect(renderedHtml).toContain('HR Head, VAYANAI');
    expect(renderedHtml).toContain('Rohit Verma');
    expect(renderedHtml).toContain('VERIFIED CREDENTIAL');
    expect(renderedHtml).toContain('api.qrserver.com');
  });
});
