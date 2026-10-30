import React from 'react';
import Link from 'next/link';

interface SiteFooterProps {
  tagline?: string;
}

export function SiteFooter({ tagline = 'MADE FOR THE WAY YOU LIKE TO GO' }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <Link className="brand" href="/">
        <span className="brand-symbol">व</span>
        <span>VAYANAI</span>
      </Link>
      <span>{tagline}</span>
      <nav>
        <Link href="/">Discover</Link>
        <Link href="/plan">Plan a trip</Link>
        <Link href="/people">Local expertise</Link>
        <Link href="/my-trips">My trips</Link>
        <Link href="/portal">Portal</Link>
        <Link href="/verify">Verify</Link>
        <Link href="/certificate/apply">Apply Certificate</Link>
      </nav>
    </footer>
  );
}
