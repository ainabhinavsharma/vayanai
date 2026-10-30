'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { storage } from '@/lib/storage';

interface SiteHeaderProps {
  ctaText?: string;
  ctaHref?: string;
}

export function SiteHeader({ ctaText = 'Start with a feeling', ctaHref = '/plan' }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setSavedCount(storage.getSavedTrips().length);
    };
    updateCount();
    window.addEventListener('vayanai-storage-update', updateCount);
    return () => window.removeEventListener('vayanai-storage-update', updateCount);
  }, []);

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-symbol">व</span>
        <span>VAYANAI</span>
      </Link>

      <nav className={`primary-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          Discover
        </Link>
        <Link
          href="/plan"
          aria-current={pathname === '/plan' ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          Plan a trip
        </Link>
        <Link
          href="/people"
          aria-current={pathname === '/people' ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          Local expertise
        </Link>
        <Link
          href="/my-trips"
          aria-current={pathname === '/my-trips' ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          My trips {savedCount > 0 && <span className="saved-count">{savedCount}</span>}
        </Link>
        <Link
          href="/portal"
          aria-current={pathname.startsWith('/portal') ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          Portal
        </Link>
        <Link
          href="/auth/signup?role=intern"
          aria-current={pathname === '/auth/signup' ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          🎓 Internships
        </Link>
        <Link
          href="/verify"
          aria-current={pathname.startsWith('/verify') ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          Verify
        </Link>
        <Link
          href="/auth/signin"
          aria-current={pathname.startsWith('/auth') ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          Sign in
        </Link>
      </nav>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link
          className="header-auth-pill"
          href="/auth/signup?role=intern"
          style={{ background: 'rgba(232, 163, 76, 0.15)', color: '#e8a34c', borderColor: 'rgba(232, 163, 76, 0.4)' }}
        >
          Apply for Internship ↗
        </Link>
        <Link className="header-auth-pill" href="/auth/signin">
          Sign In
        </Link>
        <Link className="header-cta" href={ctaHref}>
          {ctaText} <span>↗</span>
        </Link>
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '×' : '☰'}
        </button>
      </div>
    </header>
  );
}
