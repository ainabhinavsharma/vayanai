'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export default function SignInPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/v1/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        const userName = data.user?.name || data.data?.user?.name || 'User';
        showToast(`Welcome back, ${userName}!`);
        window.location.href = '/portal';
      } else {
        setErrorMessage(data.error?.message || 'Invalid credentials');
      }
    } catch {
      setErrorMessage('Network error while signing in. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card-wrap" style={{ maxWidth: '460px' }}>
        <div className="auth-header">
          <Link href="/" className="brand">
            <span className="brand-symbol">व</span>
            <span>VAYANAI</span>
          </Link>
          <h2>Sign in to your <em>journey</em></h2>
          <p>Access your itinerary, host conversations, staff pipeline, or candidate workspace.</p>
        </div>

        {errorMessage && (
          <div className="auth-error-banner">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="field-group">
            <label>Email Address / User ID</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. you@example.com"
              required
              className="journal-input"
            />
          </div>

          <div className="field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Password</label>
              <Link
                href="/auth/forgot-password"
                style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'none' }}
                title="Reset your password via email"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="journal-input"
            />
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
          >
            {isLoading ? 'Signing In...' : 'Sign In ↗'}
          </button>
        </form>

        <div className="auth-footer-link" style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'rgba(232, 163, 76, 0.08)', border: '1px solid rgba(232, 163, 76, 0.25)', padding: '12px 14px', borderRadius: '6px', color: '#c9d6ce', textAlign: 'left', lineHeight: 1.5 }}>
            <strong style={{ color: '#e8a34c', display: 'block', marginBottom: '2px', fontSize: '11.5px' }}>📋 Applied via Google Form?</strong>
            <span>If you filled out our Google Form, set your password using the same email to activate your account:</span>
            <div style={{ marginTop: '6px' }}>
              <Link href="/auth/signup?role=intern" style={{ color: '#e8a34c', fontWeight: 700, textDecoration: 'none' }}>
                Activate Google Form Account ↗
              </Link>
            </div>
          </div>

          <div>
            <span>Need a traveler or partner account? </span>
            <Link href="/auth/signup" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
              Register new account <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
