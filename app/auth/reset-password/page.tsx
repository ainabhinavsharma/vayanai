'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get('token') || '').trim();
  const { showToast } = useToast();

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setTokenValid(false);
        setTokenError('No password reset token was provided in the URL.');
        setIsValidating(false);
        return;
      }

      try {
        const res = await fetch(`/api/v1/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (data.success && data.data?.valid) {
          setTokenValid(true);
          setUserEmail(data.data.email || '');
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'This password reset link is invalid or has expired.');
        }
      } catch {
        setTokenValid(false);
        setTokenError('Network error while validating your reset link.');
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
        showToast('Password reset successful! Redirecting to sign in...');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 2200);
      } else {
        setFormError(data.error || 'Failed to update password. Please retry.');
      }
    } catch {
      setFormError('Network error while updating your password. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card-wrap" style={{ maxWidth: '460px' }}>
      <div className="auth-header">
        <Link href="/" className="brand">
          <span className="brand-symbol">व</span>
          <span>VAYANAI</span>
        </Link>
        <h2>Set new <em>password</em></h2>
        <p>Choose a secure password to restore access to your account.</p>
      </div>

      {isValidating ? (
        <div style={{ textAlign: 'center', padding: '36px 0' }}>
          <div className="verify-spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Cryptographically validating your reset link...
          </p>
        </div>
      ) : !tokenValid ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px', color: '#ffb4ab', fontFamily: 'var(--font-serif)', fontSize: '18px' }}>
            Link Expired or Invalid
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
            {tokenError}
          </p>
          <div style={{ background: 'rgba(239, 83, 80, 0.08)', border: '1px solid rgba(239, 83, 80, 0.25)', padding: '12px', borderRadius: '6px', margin: '0 0 20px', fontSize: '11.5px', color: '#d1ddd3', textAlign: 'left' }}>
            Password reset links expire automatically after <strong>60 minutes</strong> or after being used once to protect your account.
          </div>
          <Link
            href="/auth/forgot-password"
            className="primary-btn"
            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
          >
            Request New Reset Link ↗
          </Link>
        </div>
      ) : isSuccess ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>✓</div>
          <h3 style={{ margin: '0 0 8px', color: '#4caf50', fontFamily: 'var(--font-serif)', fontSize: '19px' }}>
            Password Updated!
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
            Your password has been securely updated. All previous active sessions have been invalidated.
          </p>
          <Link
            href="/auth/signin"
            className="primary-btn"
            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
          >
            Sign In with New Password ↗
          </Link>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="auth-form">
          {userEmail && (
            <div style={{ background: 'rgba(232, 163, 76, 0.08)', border: '1px solid rgba(232, 163, 76, 0.25)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '11.5px', color: '#c9d6ce' }}>
              Resetting password for: <strong style={{ color: 'var(--gold-lite)' }}>{userEmail}</strong>
            </div>
          )}

          {formError && (
            <div className="auth-error-banner" style={{ background: 'rgba(239, 83, 80, 0.12)', border: '1px solid rgba(239, 83, 80, 0.4)', color: '#ffb4ab', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', margin: '0 0 16px' }}>
              ⚠️ {formError}
            </div>
          )}

          <div className="field-group">
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              className="journal-input"
            />
          </div>

          <div className="field-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={8}
              className="journal-input"
            />
          </div>

          <div style={{ margin: '4px 0 12px', fontSize: '11px', color: 'var(--muted)' }}>
            <span style={{ color: password.length >= 8 ? '#4caf50' : 'inherit' }}>
              {password.length >= 8 ? '✓' : '•'} At least 8 characters
            </span>
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={isSubmitting || password.length < 8}
            style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
          >
            {isSubmitting ? 'Updating Password...' : 'Set New Password ↗'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page-container">
      <Suspense fallback={
        <div className="auth-card-wrap" style={{ maxWidth: '460px', textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Loading reset page...</p>
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
