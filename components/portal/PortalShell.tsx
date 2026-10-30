'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PortalRole,
  PortalConversation,
  TravelPassData,
  PartnerInquiry,
  AdminPartnerReview,
  NextStepAction,
  PortalNotification,
  TravelJournalEntry,
  TravelCohort,
  LocalImpactLedger,
  VayuAlignmentScore
} from '@/types/portal';
import { User } from '@/types/auth';
import { TravelerOverview } from './TravelerOverview';
import { PartnerDashboard } from './PartnerDashboard';
import { AdminDashboard } from './AdminDashboard';
import { StaffDashboard } from './StaffDashboard';
import { InternDashboard } from './InternDashboard';
import { MessageThread } from './MessageThread';
import { TravelPassDocument } from './TravelPassDocument';
import { NotificationCenter } from './NotificationCenter';
import { VayuAlignmentStudio } from './VayuAlignmentStudio';
import { TravelJournal } from './TravelJournal';
import { CohortsDirectory } from './CohortsDirectory';
import { ItineraryDayCard } from '@/components/trip/ItineraryDayCard';
import { VayuDrawer } from '@/components/trip/VayuDrawer';
import { useToast } from '@/components/ui/Toast';
import { storage } from '@/lib/storage';
import { routeData } from '@/lib/mock-routes';
import { RouteDetail } from '@/types';

interface PortalShellProps {
  initialRole?: PortalRole;
  initialConversations: PortalConversation[];
  initialPass: TravelPassData;
  initialInquiries: PartnerInquiry[];
  initialPartners: AdminPartnerReview[];
  initialNextStep: NextStepAction;
  initialNotifications?: PortalNotification[];
  initialJournalEntries?: TravelJournalEntry[];
  initialCohorts?: TravelCohort[];
  initialImpactLedger?: LocalImpactLedger;
}

export function PortalShell({
  initialRole = 'traveler',
  initialConversations,
  initialPass,
  initialInquiries,
  initialPartners,
  initialNextStep,
  initialNotifications = [],
  initialJournalEntries = [],
  initialCohorts = [],
  initialImpactLedger
}: PortalShellProps) {
  const { showToast } = useToast();

  const [role, setRole] = useState<PortalRole>(initialRole);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Traveler state
  const [route, setRoute] = useState<RouteDetail>(routeData.meghalaya);
  const [conversations, setConversations] = useState<PortalConversation[]>(initialConversations);
  const [pass] = useState<TravelPassData>(initialPass);
  const [nextStep] = useState<NextStepAction>(initialNextStep);
  const [isGentlerPace, setIsGentlerPace] = useState(false);
  const [vayuDrawerOpen, setVayuDrawerOpen] = useState(false);
  const [vayuQuestion, setVayuQuestion] = useState<string | null>(null);

  // Advanced Portal state
  const [notifications, setNotifications] = useState<PortalNotification[]>(initialNotifications);
  const [journalEntries, setJournalEntries] = useState<TravelJournalEntry[]>(initialJournalEntries);
  const [cohorts, setCohorts] = useState<TravelCohort[]>(initialCohorts);
  const [impactLedger] = useState<LocalImpactLedger | undefined>(initialImpactLedger);
  const [, setAppliedScore] = useState<VayuAlignmentScore | null>(null);

  // Partner state
  const [inquiries, setInquiries] = useState<PartnerInquiry[]>(initialInquiries);

  // Admin state
  const [partners, setPartners] = useState<AdminPartnerReview[]>(initialPartners);

  useEffect(() => {
    const brief = storage.getLastBrief();
    const key = routeData[brief.routeKey] ? brief.routeKey : 'meghalaya';
    setRoute(routeData[key]);

    // Check active session from /api/v1/auth/me
    async function checkAuthSession() {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (res.ok) {
          const data = await res.json();
          const userObj = data?.user || data?.data?.user;
          if (userObj) {
            setCurrentUser(userObj);
            const userRole = userObj.role as PortalRole;
            if (userRole) {
              setRole(userRole);
              if (userRole === 'staff') setActiveTab('staff-pipeline');
              else if (userRole === 'intern') setActiveTab('intern-workspace');
              else if (userRole === 'partner') setActiveTab('partner-overview');
              else if (userRole === 'admin') setActiveTab('admin-overview');
              else if (userRole === 'traveler') setActiveTab('overview');
            }
          } else {
            window.location.href = '/auth/signin';
          }
        } else {
          window.location.href = '/auth/signin';
        }
      } catch {
        // Offline / fallback mode
      }
    }
    checkAuthSession();
  }, [initialRole]);

  const handleRoleChange = (newRole: PortalRole) => {
    if (currentUser?.role !== 'admin') {
      showToast('Role switching is reserved for Administrators.');
      return;
    }
    setRole(newRole);
    if (newRole === 'traveler') setActiveTab('overview');
    else if (newRole === 'partner') setActiveTab('partner-overview');
    else if (newRole === 'admin') setActiveTab('admin-overview');
    else if (newRole === 'staff') setActiveTab('staff-pipeline');
    else if (newRole === 'intern') setActiveTab('intern-workspace');
    showToast(`Switched view to ${newRole.toUpperCase()} Portal`);
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/v1/auth/signout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin';
    }
  };

  const handleSendMessage = (convId: string, text: string) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: (role === 'partner' ? 'partner' : 'traveler') as 'traveler' | 'partner',
      text,
      sentAt: new Date().toISOString()
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            lastMessageSnippet: text,
            lastMessageAt: newMsg.sentAt,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );
    showToast('Message sent to local partner.');
  };

  const handleSubmitQuote = (inquiryId: string, quoteINR: number, quoteNotes: string) => {
    setInquiries((prev) =>
      prev.map((inq) => {
        if (inq.id === inquiryId) {
          return {
            ...inq,
            status: 'quoted',
            quoteINR,
            quoteNotes
          };
        }
        return inq;
      })
    );
    showToast(`Quote of ₹${quoteINR.toLocaleString('en-IN')} sent to traveler.`);
  };

  const handleReviewPartner = (partnerId: string, status: 'verified' | 'rejected', reason?: string) => {
    setPartners((prev) =>
      prev.map((p) => {
        if (p.id === partnerId) {
          return {
            ...p,
            verificationStatus: status,
            rejectionReason: reason
          };
        }
        return p;
      })
    );
    showToast(`Partner status updated to ${status.toUpperCase()}.`);
  };

  const unreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkNotifRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleApplyPacing = (score: VayuAlignmentScore) => {
    setAppliedScore(score);
    setIsGentlerPace(true);
    showToast(`Active route pacing calibrated to ${score.rhythmTitle}!`);
  };

  const handleAddJournalEntry = (entry: Omit<TravelJournalEntry, 'id'>) => {
    const newEntry: TravelJournalEntry = {
      ...entry,
      id: `entry-${Date.now()}`
    };
    setJournalEntries((prev) => [newEntry, ...prev]);
  };

  const handleRequestJoinCohort = (
    cohortId: string,
    travelerName: string,
    travelerEmail: string,
    note?: string
  ) => {
    setCohorts((prev) =>
      prev.map((c) => {
        if (c.id === cohortId) {
          const newSeats = Math.max(0, c.availableSeats - 1);
          return {
            ...c,
            availableSeats: newSeats,
            status: newSeats === 0 ? 'waitlist' : c.status
          };
        }
        return c;
      })
    );

    // Also register an inquiry in the host queue
    const targetCohort = cohorts.find((c) => c.id === cohortId);
    if (targetCohort) {
      setInquiries((prev) => [
        {
          id: `inq-cohort-${Date.now()}`,
          travelerName,
          origin: 'Portal Traveler',
          destination: targetCohort.destination,
          dates: targetCohort.dates,
          party: '1 Traveller (Cohort Booking Request)',
          specialRequests: [
            `Cohort Title: ${targetCohort.title}`,
            `Contact Email: ${travelerEmail}`,
            note || 'Requested seat in small-group cohort.'
          ],
          status: 'new',
          submittedAt: new Date().toISOString()
        },
        ...prev
      ]);
    }
  };

  return (
    <div className="portal-app">
      {/* ── SIDEBAR ── */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`} id="portalSidebar">
        <div className="sidebar-logo">
          <Link href="/" className="brand">
            <span className="brand-symbol">व</span>
            <span>VAYANAI PORTAL</span>
          </Link>
        </div>

        {/* Role Switcher Pill (Admin Realm Preview Only) */}
        {currentUser?.role === 'admin' && (
          <div className="portal-role-selector">
            <label>PORTAL REALM (ADMIN PREVIEW)</label>
            <div className="role-pills">
              <button
                type="button"
                className={`role-pill ${role === 'traveler' ? 'active' : ''}`}
                onClick={() => handleRoleChange('traveler')}
              >
                Traveler
              </button>
              <button
                type="button"
                className={`role-pill ${role === 'partner' ? 'active' : ''}`}
                onClick={() => handleRoleChange('partner')}
              >
                Host
              </button>
              <button
                type="button"
                className={`role-pill ${role === 'admin' ? 'active' : ''}`}
                onClick={() => handleRoleChange('admin')}
              >
                Admin
              </button>
              <button
                type="button"
                className={`role-pill ${role === 'staff' ? 'active' : ''}`}
                onClick={() => handleRoleChange('staff')}
              >
                Staff
              </button>
              <button
                type="button"
                className={`role-pill ${role === 'intern' ? 'active' : ''}`}
                onClick={() => handleRoleChange('intern')}
              >
                Intern
              </button>
            </div>
          </div>
        )}

        {/* Navigation for Traveler */}
        {role === 'traveler' && (
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">📊</i> Overview & Command
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => { setActiveTab('notifications'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">🔔</i> Route Alerts {unreadNotifCount > 0 && <span className="nav-dot">{unreadNotifCount}</span>}
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'trips' ? 'active' : ''}`}
              onClick={() => { setActiveTab('trips'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">🗺️</i> Itinerary & Day Pacing
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'alignment' ? 'active' : ''}`}
              onClick={() => { setActiveTab('alignment'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">✳️</i> Alignment Studio
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'vayu' ? 'active' : ''}`}
              onClick={() => { setActiveTab('vayu'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">✨</i> Vayu AI Workspace
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'journal' ? 'active' : ''}`}
              onClick={() => { setActiveTab('journal'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">📓</i> Field Journal
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'cohorts' ? 'active' : ''}`}
              onClick={() => { setActiveTab('cohorts'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">👥</i> Group Cohorts
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => { setActiveTab('messages'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">💬</i> Messages {unreadCount > 0 && <span className="nav-dot">{unreadCount}</span>}
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => { setActiveTab('documents'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">📄</i> Travel Pass & Packing
            </button>
            <Link href="/plan" className="nav-item">
              <i className="nav-icon">✨</i> Plan New Trip ↗
            </Link>
          </nav>
        )}

        {/* Navigation for Partner/Host */}
        {role === 'partner' && (
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activeTab === 'partner-overview' ? 'active' : ''}`}
              onClick={() => { setActiveTab('partner-overview'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">🏡</i> Host Dashboard
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'partner-messages' ? 'active' : ''}`}
              onClick={() => { setActiveTab('partner-messages'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">💬</i> Traveler Inquiries
            </button>
            <Link href="/people" className="nav-item">
              <i className="nav-icon">👥</i> Public Directory Card ↗
            </Link>
          </nav>
        )}

        {/* Navigation for Admin */}
        {role === 'admin' && (
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activeTab === 'admin-overview' ? 'active' : ''}`}
              onClick={() => { setActiveTab('admin-overview'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">🛡️</i> Partner Verification
            </button>
            <Link href="/" className="nav-item">
              <i className="nav-icon">🌐</i> View Public Site ↗
            </Link>
          </nav>
        )}

        {/* Navigation for Staff (BDA) */}
        {role === 'staff' && (
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activeTab === 'staff-pipeline' ? 'active' : ''}`}
              onClick={() => { setActiveTab('staff-pipeline'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">📈</i> Partner Outreach Pipeline
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'staff-interns' ? 'active' : ''}`}
              onClick={() => { setActiveTab('staff-interns'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">🎓</i> Intern Candidate Review
            </button>
            <Link href="/" className="nav-item">
              <i className="nav-icon">🌐</i> View Public Site ↗
            </Link>
          </nav>
        )}

        {/* Navigation for Intern */}
        {role === 'intern' && (
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activeTab === 'intern-workspace' ? 'active' : ''}`}
              onClick={() => { setActiveTab('intern-workspace'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">🎓</i> Virtual Interview & Workspace
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'intern-vayu' ? 'active' : ''}`}
              onClick={() => { setActiveTab('intern-vayu'); setSidebarOpen(false); }}
            >
              <i className="nav-icon">✨</i> Vayu AI Trip Companion
            </button>
            <Link href="/plan" className="nav-item">
              <i className="nav-icon">🗺️</i> Review Curated Routes ↗
            </Link>
            <Link href="/people" className="nav-item">
              <i className="nav-icon">👥</i> Local Host Directory ↗
            </Link>
          </nav>
        )}

        <div className="sidebar-footer">
          <div className="user-badge-pill" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="user-avatar-mini">
                {currentUser?.name
                  ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'GS'}
              </span>
              <div className="user-info-text">
                <b>
                  {currentUser?.name || 'Guest User'}
                </b>
                <small>{currentUser?.role ? `${currentUser.role.toUpperCase()} (VERIFIED)` : 'SESSION SIGNED OUT'}</small>
              </div>
            </div>

            {currentUser ? (
              <button
                type="button"
                className="portal-signout-btn"
                onClick={handleSignOut}
                title="Sign out of active session"
                style={{
                  background: 'none',
                  border: '1px solid rgba(232, 163, 76, 0.3)',
                  color: 'var(--gold)',
                  borderRadius: '4px',
                  padding: '3px 7px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="portal-signin-link"
                title="Sign in with your account"
                style={{
                  color: 'var(--gold)',
                  fontSize: '11px',
                  textDecoration: 'none',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(232, 163, 76, 0.3)'
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Scrim for mobile sidebar */}
      <div
        className={`portal-scrim ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── MAIN CONTENT AREA ── */}
      <div className="portal-content-wrap">
        {/* Mobile Topbar */}
        <header className="portal-m-topbar">
          <button
            type="button"
            className="m-burger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Portal Menu"
          >
            ☰
          </button>
          <span className="m-title">VAYANAI · {role.toUpperCase()} PORTAL</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {role === 'traveler' && (
              <button
                type="button"
                className="topbar-notif-btn"
                onClick={() => setActiveTab('notifications')}
                title="Route Alerts"
                style={{ background: 'none', border: 'none', color: 'var(--paper)', cursor: 'pointer', fontSize: '13px' }}
              >
                🔔 {unreadNotifCount > 0 && <span className="unread-dot">{unreadNotifCount}</span>}
              </button>
            )}
            <Link href="/" className="m-home-link">Exit ↗</Link>
          </div>
        </header>

        <main className="portal-main-panel">
          {/* Traveler Views */}
          {role === 'traveler' && activeTab === 'overview' && (
            <TravelerOverview
              route={route}
              nextStep={nextStep}
              impactLedger={impactLedger}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {role === 'traveler' && activeTab === 'trips' && (
            <div className="panel-tab-content">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow eyebrow-muted">
                    <i></i> ACTIVE ROUTE
                  </div>
                  <h2>{route.name}, <em>five days at your pace.</em></h2>
                </div>
                <button
                  type="button"
                  className="small-action"
                  onClick={() => setIsGentlerPace(!isGentlerPace)}
                >
                  {isGentlerPace ? 'Keep original pace ↑' : 'Make days gentler ↓'}
                </button>
              </div>

              <div className="itinerary-days">
                {route.days.map((day) => (
                  <ItineraryDayCard
                    key={day.dayNumber}
                    day={day}
                    isGentlerPace={isGentlerPace}
                    onAskVayu={(q) => {
                      setVayuQuestion(q);
                      setVayuDrawerOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {role === 'traveler' && activeTab === 'vayu' && (
            <div className="panel-tab-content">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow eyebrow-muted">
                    <i></i> AI PLANNING COMPANION
                  </div>
                  <h2>Meet <em>Vayu.</em></h2>
                </div>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '20px' }}>
                Vayu monitors weather, highway buffers, and altitude notes for {route.name}.
              </p>
              <div className="quick-questions" style={{ maxWidth: '480px' }}>
                <button
                  type="button"
                  className="ask-prompt"
                  onClick={() => {
                    setVayuQuestion('Can we make this trip more food-focused?');
                    setVayuDrawerOpen(true);
                  }}
                >
                  More local food & culinary stops <span>↗</span>
                </button>
                <button
                  type="button"
                  className="ask-prompt"
                  onClick={() => {
                    setVayuQuestion('Can we keep road journeys shorter?');
                    setVayuDrawerOpen(true);
                  }}
                >
                  Reduce road journey times <span>↗</span>
                </button>
                <button
                  type="button"
                  className="ask-prompt"
                  onClick={() => {
                    setVayuQuestion('What are essential health and altitude precautions?');
                    setVayuDrawerOpen(true);
                  }}
                >
                  Health & altitude protocols <span>↗</span>
                </button>
              </div>
            </div>
          )}

          {role === 'traveler' && activeTab === 'messages' && (
            <div className="panel-tab-content">
              <MessageThread
                conversations={conversations}
                onSendMessage={handleSendMessage}
              />
            </div>
          )}

          {role === 'traveler' && activeTab === 'documents' && (
            <div className="panel-tab-content">
              <TravelPassDocument pass={pass} />
            </div>
          )}

          {role === 'traveler' && activeTab === 'notifications' && (
            <div className="panel-tab-content">
              <NotificationCenter
                notifications={notifications}
                onMarkRead={handleMarkNotifRead}
                onMarkAllRead={handleMarkAllNotifsRead}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            </div>
          )}

          {role === 'traveler' && activeTab === 'alignment' && (
            <div className="panel-tab-content">
              <VayuAlignmentStudio
                onApplyPacing={handleApplyPacing}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            </div>
          )}

          {role === 'traveler' && activeTab === 'journal' && (
            <div className="panel-tab-content">
              <TravelJournal
                initialEntries={journalEntries}
                onAddEntry={handleAddJournalEntry}
              />
            </div>
          )}

          {role === 'traveler' && activeTab === 'cohorts' && (
            <div className="panel-tab-content">
              <CohortsDirectory
                initialCohorts={cohorts}
                onRequestJoin={handleRequestJoinCohort}
              />
            </div>
          )}

          {/* Partner Views */}
          {role === 'partner' && (activeTab === 'partner-overview' || activeTab === 'partner-inquiries') && (
            <PartnerDashboard
              inquiries={inquiries}
              onSubmitQuote={handleSubmitQuote}
              onOpenChat={() => setActiveTab('partner-messages')}
            />
          )}

          {role === 'partner' && activeTab === 'partner-messages' && (
            <div className="panel-tab-content">
              <MessageThread
                conversations={conversations}
                onSendMessage={handleSendMessage}
              />
            </div>
          )}

          {/* Admin Views */}
          {role === 'admin' && (
            <AdminDashboard
              partners={partners}
              onReviewPartner={handleReviewPartner}
            />
          )}

          {/* Staff (BDA) Views */}
          {role === 'staff' && (
            <div className="panel-tab-content">
              <StaffDashboard />
            </div>
          )}

          {/* Intern Views */}
          {role === 'intern' && (
            <div className="panel-tab-content">
              {activeTab === 'intern-vayu' ? (
                <div style={{ maxWidth: '840px', margin: '0 auto', padding: '16px 0' }}>
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow eyebrow-muted">
                        <i></i> PRODUCT FAMILIARIZATION & EVALUATION
                      </div>
                      <h2>Vayu AI Trip Companion <em>Workspace</em></h2>
                    </div>
                    <button
                      type="button"
                      className="button button-gold"
                      onClick={() => setVayuDrawerOpen(true)}
                      style={{ minHeight: '38px', padding: '0 16px', fontSize: '11px' }}
                    >
                      Launch Vayu Assistant ↗
                    </button>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                    As part of your Vayanai data and engineering internship, evaluate how our conversational trip companion generates pacing recommendations, highway buffers, and Khasi community homestay matches.
                  </p>
                  <div style={{ background: '#131c16', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ color: '#e8a34c', marginBottom: '8px', fontSize: '16px' }}>Curriculum Research Tasks</h3>
                    <ul style={{ color: '#f4ede0', fontSize: '13px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                      <li>Query Vayu on Meghalaya 5-day route pacing with elder travellers.</li>
                      <li>Observe how the system calibrates Guwahati &rarr; Shillong highway widening delays.</li>
                      <li>Verify the 88% direct community spend retention pledge calculation.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <InternDashboard currentUser={currentUser} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Vayu Assistant Drawer */}
      <VayuDrawer
        isOpen={vayuDrawerOpen}
        onClose={() => setVayuDrawerOpen(false)}
        pendingQuestion={vayuQuestion}
        onQuestionConsumed={() => setVayuQuestion(null)}
      />
    </div>
  );
}
