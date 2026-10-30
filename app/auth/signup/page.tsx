'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PortalRole } from '@/types/portal';
import { useToast } from '@/components/ui/Toast';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const roleParam = searchParams.get('role') as PortalRole | null;
  const trackParam = searchParams.get('track');

  const [role, setRole] = useState<PortalRole>(roleParam || 'traveler');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [trackName, setTrackName] = useState(trackParam || 'Data Analyst');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (roleParam && ['traveler', 'partner', 'intern', 'staff', 'admin'].includes(roleParam)) {
      setRole(roleParam);
    }
    if (trackParam) {
      setTrackName(trackParam);
    }
  }, [roleParam, trackParam]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone,
          organization,
          licenseNumber,
          college: collegeName,
          collegeName,
          track: trackName,
          trackName
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Account registered as ${role.toUpperCase()}! Welcome, ${data.data?.user?.name || name}.`);
        if (role === 'intern' && data.data?.magicToken) {
          // If intern application has magic token, direct to virtual assessment or portal
          window.location.href = `/intern/assessment?token=${encodeURIComponent(data.data.magicToken)}`;
        } else {
          window.location.href = '/portal';
        }
      } else {
        setErrorMessage(data.error?.message || data.error || 'Registration failed');
      }
    } catch {
      setErrorMessage('Network error during registration. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card-wrap">
        <div className="auth-header">
          <Link href="/" className="brand">
            <span className="brand-symbol">व</span>
            <span>VAYANAI</span>
          </Link>
          <h2>Join the <em>Network</em></h2>
          <p>Register as a traveler, partner host, intern candidate, or operations associate.</p>
        </div>

        {errorMessage && (
          <div className="auth-error-banner">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Role Selector Pill */}
        <div className="signup-role-selector">
          <label>SELECT ACCOUNT REALM</label>
          <div className="role-pills" style={{ marginTop: '6px' }}>
            <button
              type="button"
              className={`role-pill ${role === 'traveler' ? 'active' : ''}`}
              onClick={() => setRole('traveler')}
            >
              🎒 Traveler
            </button>
            <button
              type="button"
              className={`role-pill ${role === 'partner' ? 'active' : ''}`}
              onClick={() => setRole('partner')}
            >
              🏡 Host
            </button>
            <button
              type="button"
              className={`role-pill ${role === 'intern' ? 'active' : ''}`}
              onClick={() => setRole('intern')}
            >
              🎓 Intern
            </button>
            <button
              type="button"
              className={`role-pill ${role === 'staff' ? 'active' : ''}`}
              onClick={() => setRole('staff')}
            >
              💼 Staff
            </button>
          </div>
        </div>

        <form onSubmit={handleRegister} className="auth-form" style={{ marginTop: '20px' }}>
          <div className="field-group">
            <label>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              required
              className="journal-input"
            />
          </div>

          <div className="field-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="journal-input"
            />
          </div>

          <div className="field-group">
            <label>Password (Minimum 8 Characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              required
              className="journal-input"
            />
          </div>

          <div className="field-group">
            <label>Phone / WhatsApp Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98XXX XXXXX"
              required
              className="journal-input"
            />
          </div>

          {/* Conditional Role-Specific Fields */}
          {role === 'partner' && (
            <>
              <div className="field-group">
                <label>Homestay / Collective Organization Name</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Sohra Eco Homestay Collective"
                  required
                  className="journal-input"
                />
              </div>
              <div className="field-group">
                <label>Tourism Registration / License Number</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MEGH-TOUR-2026-XXXX"
                  required
                  className="journal-input"
                />
              </div>
            </>
          )}

          {role === 'intern' && (
            <>
              <div className="field-group">
                <label>College / University Name</label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. Delhi University / IIT Guwahati"
                  required
                  className="journal-input"
                />
              </div>
              <div className="field-group">
                <label>Internship Track</label>
                <select
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  className="journal-input"
                >
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="Artificial Intelligence (AI) and Machine Learning (ML)">Artificial Intelligence (AI) and Machine Learning (ML)</option>
                  <option value="Sustainable Regional Operations & Growth">Sustainable Regional Operations & Growth</option>
                </select>
              </div>
            </>
          )}

          {role === 'staff' && (
            <div className="field-group">
              <label>BDA Employee Verification Code</label>
              <input
                type="text"
                defaultValue="VAYANAI-BDA-2026"
                placeholder="Enter company invite code"
                required
                className="journal-input"
              />
            </div>
          )}

          <button
            type="submit"
            className="primary-btn"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
          >
            {isLoading ? 'Creating Account...' : role === 'intern' ? 'Submit Application & Launch Interview ↗' : `Register as ${role.toUpperCase()} ↗`}
          </button>
        </form>

        <div className="auth-footer-link">
          <span>Already have an account?</span>
          <Link href="/auth/signin" className="quiet-link">
            Sign in here <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', padding: '60px' }}>Loading registration...</div>}>
      <SignUpContent />
    </Suspense>
  );
}
