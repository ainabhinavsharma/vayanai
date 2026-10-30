'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

export default function ForgotPasswordPage() {
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (data.success) {
        setIsSubmitted(true);
        if (data.data?.debugResetUrl) {
          setDebugUrl(data.data.debugResetUrl);
        }
        showToast('Password reset link dispatched!');
      } else {
        setErrorMessage(data.error || 'Failed to dispatch reset link. Please verify your email.');
      }
    } catch {
      setErrorMessage('Network error while processing your request. Please check your connection.');
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
          <h2>Reset your <em>password</em></h2>
          <p>
            Enter your registered email address and we will dispatch a secure link to create a new password.
          </p>
        </div>

        {errorMessage && (
          <div className="auth-error-banner" style={{ background: 'rgba(239, 83, 80, 0.12)', border: '1px solid rgba(239, 83, 80, 0.4)', color: '#ffb4ab', padding: '12px 14px', borderRadius: '6px', fontSize: '12px', margin: '0 0 16px', lineHeight: 1.5 }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field-group">
              <label>Registered Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. you@example.com"
                required
                autoFocus
                className="journal-input"
              />
              <small style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                We will send an official reset link valid for 60 minutes.
              </small>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={isLoading}
              style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
            >
              {isLoading ? 'Dispatching Reset Link...' : 'Send Reset Link ↗'}
            </button>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <Link
                href="/auth/signin"
                style={{ fontSize: '11.5px', color: 'var(--muted)', textDecoration: 'none' }}
              >
                ← Return to Sign In
              </Link>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>✉️</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--paper)', fontFamily: 'var(--font-serif)', fontSize: '19px' }}>
              Check Your Inbox
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
              We have dispatched a password reset link to <strong style={{ color: 'var(--gold-lite)' }}>{email}</strong>. The link is valid for <strong>60 minutes</strong>.
            </p>

            {debugUrl && (
              <div style={{ background: 'rgba(232, 163, 76, 0.1)', border: '1px dashed rgba(232, 163, 76, 0.5)', padding: '12px', borderRadius: '6px', margin: '0 0 20px', textAlign: 'left', fontSize: '11.5px' }}>
                <span style={{ color: 'var(--gold)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  🔬 Local Testing Preview:
                </span>
                <span style={{ color: 'var(--muted)', wordBreak: 'break-all', display: 'block', marginBottom: '8px' }}>
                  {debugUrl}
                </span>
                <Link
                  href={debugUrl}
                  className="button button-gold"
                  style={{ display: 'inline-block', fontSize: '10px', textDecoration: 'none', padding: '6px 12px' }}
                >
                  Open Reset Page Directly ↗
                </Link>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href="/auth/signin"
                className="primary-btn"
                style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
              >
                Return to Sign In ↗
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setDebugUrl(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Didn&apos;t receive email? Try another address
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
