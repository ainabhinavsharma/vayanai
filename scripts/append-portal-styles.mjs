import fs from 'node:fs';

const portalCss = `
/* ==========================================================================
   VAYANAI MULTI-ROLE PORTAL STYLES (Adapted from DBERT Portal Architecture)
   ========================================================================== */
.portal-app {
  display: flex;
  min-height: 100vh;
  background: var(--ink);
  color: var(--paper);
}

.portal-sidebar {
  width: 260px;
  background: var(--ink2);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 30;
  padding: 24px 18px;
  overflow-y: auto;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.portal-role-selector {
  margin: 18px 0;
  padding: 12px;
  background: #111a19;
  border: 1px solid var(--line);
}

.portal-role-selector label {
  display: block;
  font-size: 7px;
  letter-spacing: 0.15em;
  color: var(--gold);
  margin-bottom: 8px;
}

.role-pills {
  display: flex;
  gap: 4px;
}

.role-pill {
  flex: 1;
  background: none;
  border: 1px solid var(--line);
  padding: 6px 0;
  font-size: 8px;
  color: var(--muted);
  transition: 0.2s;
  cursor: pointer;
}

.role-pill.active {
  background: var(--gold);
  color: var(--ink);
  font-weight: 700;
  border-color: var(--gold);
}

.portal-sidebar .sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.portal-sidebar .nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  font-size: 9px;
  color: #cdd6ce;
  background: none;
  border: 1px solid transparent;
  text-align: left;
  width: 100%;
  cursor: pointer;
  transition: 0.2s;
}

.portal-sidebar .nav-item:hover,
.portal-sidebar .nav-item.active {
  background: #1f302b;
  border-color: #ffffff20;
  color: var(--gold-lite);
}

.nav-icon {
  font-style: normal;
  font-size: 13px;
}

.nav-dot {
  margin-left: auto;
  background: var(--gold);
  color: var(--ink);
  font-size: 7px;
  font-weight: 700;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
}

.user-badge-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #121d1b;
  border: 1px solid var(--line);
  margin-top: auto;
}

.user-avatar-mini {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--ink);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
}

.user-info-text b {
  display: block;
  font-size: 9px;
  color: var(--paper);
}

.user-info-text small {
  display: block;
  font-size: 7px;
  color: var(--gold);
  letter-spacing: 0.1em;
}

.portal-content-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.portal-m-topbar {
  display: none;
  height: 60px;
  padding: 0 var(--g);
  border-bottom: 1px solid var(--line);
  background: var(--ink2);
  align-items: center;
  justify-content: space-between;
}

.m-burger {
  background: none;
  border: 0;
  color: var(--paper);
  font-size: 20px;
  cursor: pointer;
}

.m-title {
  font-size: 9px;
  letter-spacing: 0.15em;
  color: var(--gold);
}

.m-home-link {
  font-size: 9px;
  color: var(--gold-lite);
}

.portal-main-panel {
  padding: clamp(24px, 4vw, 48px);
  max-width: 1200px;
  width: 100%;
}

.portal-hero-banner {
  background: radial-gradient(ellipse at 70% 30%, #294038 0%, #152421 70%);
  border: 1px solid var(--line);
  padding: 28px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.portal-hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.portal-avatar-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--gold) 0%, #d97706 100%);
  color: var(--ink);
  font: 700 18px var(--sans);
  display: grid;
  place-items: center;
  box-shadow: 0 0 24px #e8a34c30;
}

.portal-hero-info h1 {
  font: 500 clamp(24px, 3.2vw, 36px) var(--serif);
  margin: 0 0 4px;
}

.portal-hero-info p {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
}

.portal-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag {
  font-size: 8px;
  letter-spacing: 0.08em;
  padding: 5px 9px;
  border-radius: 4px;
}

.tag-gold { background: #e8a34c22; color: var(--gold-lite); border: 1px solid #e8a34c55; }
.tag-blue { background: #2563eb22; color: #93c5fd; border: 1px solid #2563eb55; }
.tag-green { background: #16a34a22; color: #86efac; border: 1px solid #16a34a55; }
.tag-amber { background: #d9770622; color: #fde68a; border: 1px solid #d9770655; }

.nextstep-card {
  background: var(--ink2);
  border: 1px solid var(--line);
  border-left: 4px solid var(--gold);
  padding: 22px;
  margin-bottom: 24px;
}

.ns-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.ns-icon {
  font-size: 20px;
}

.badge {
  font-size: 7px;
  letter-spacing: 0.15em;
  padding: 3px 6px;
  font-weight: 700;
}

.badge-amber { background: #d9770630; color: #fef08a; border: 1px solid #d97706; }
.badge-gold { background: #e8a34c25; color: var(--gold-lite); border: 1px solid var(--gold); }
.badge-blue { background: #2563eb30; color: #bfdbfe; border: 1px solid #2563eb; }
.badge-green { background: #16a34a30; color: #bbf7d0; border: 1px solid #16a34a; }

.ns-title {
  font: 500 22px var(--serif);
  margin: 0 0 8px;
  color: var(--paper);
}

.ns-msg {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.portal-dashboard-grid {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr;
  gap: 24px;
}

.portal-summary-card, .quick-access-card, .source-freshness-card, .pass-card {
  background: var(--ink2);
  border: 1px solid var(--line);
  padding: 22px;
  margin-bottom: 20px;
}

.summary-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.summary-card-header h3, .quick-access-card h4, .pass-card-title h3 {
  font: 500 18px var(--serif);
  margin: 0;
}

.highlights-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.highlight-pill {
  background: #111a19;
  border: 1px solid #ffffff1a;
  padding: 12px;
}

.highlight-pill b {
  display: block;
  font-size: 9px;
  color: var(--gold);
}

.highlight-pill span {
  display: block;
  font-size: 11px;
  font-weight: 500;
  margin: 4px 0 2px;
}

.highlight-pill small {
  font-size: 8px;
  color: var(--muted);
}

.tool-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.tool-links button {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #131f1d;
  border: 1px solid var(--line);
  padding: 10px 14px;
  font-size: 9px;
  color: var(--paper);
  text-align: left;
  transition: 0.2s;
  cursor: pointer;
}

.tool-links button:hover {
  border-color: var(--gold);
  color: var(--gold-lite);
}

.source-freshness-card {
  background: #121e1b;
}

.source-status-badge {
  font-size: 8px;
  letter-spacing: 0.12em;
  color: var(--leaf);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--leaf);
  box-shadow: 0 0 6px var(--leaf);
}

.source-freshness-card p {
  font-size: 8px;
  color: var(--muted);
  margin: 0;
}

.portal-metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.metric-box {
  background: var(--ink2);
  border: 1px solid var(--line);
  padding: 18px;
  text-align: center;
}

.metric-val {
  display: block;
  font: 500 32px var(--serif);
  color: var(--gold-lite);
}

.metric-lbl {
  font-size: 8px;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-transform: uppercase;
}

.partner-header-card, .admin-header-card {
  background: var(--ink2);
  border: 1px solid var(--line);
  padding: 24px;
  margin-bottom: 24px;
}

.partner-header-card h2, .admin-header-card h2 {
  font: 500 28px var(--serif);
  margin: 10px 0 6px;
}

.partner-header-card p, .admin-header-card p {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 14px;
}

.section-title-row h3 {
  font: 500 20px var(--serif);
  margin: 0;
}

.section-title-row span {
  font-size: 9px;
  color: var(--gold);
}

.inquiries-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.inquiry-card {
  background: var(--ink2);
  border: 1px solid var(--line);
  padding: 18px;
  display: flex;
  flex-direction: column;
}

.inquiry-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.inquiry-header h4 {
  font: 500 16px var(--serif);
  margin: 0;
}

.inquiry-header small {
  color: var(--muted);
  font-size: 8px;
}

.status-pill {
  font-size: 7px;
  letter-spacing: 0.1em;
  padding: 3px 6px;
  border-radius: 3px;
}

.status-new { background: #2563eb30; color: #93c5fd; border: 1px solid #2563eb; }
.status-quoted { background: #16a34a30; color: #86efac; border: 1px solid #16a34a; }

.inquiry-details p {
  font-size: 9px;
  color: var(--paper);
  margin: 0 0 8px;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 12px;
}

.pref-tag {
  font-size: 7px;
  background: #111a19;
  border: 1px solid #ffffff1a;
  padding: 3px 6px;
  color: var(--muted);
}

.quoted-box {
  background: #152622;
  border-left: 3px solid var(--leaf);
  padding: 10px 12px;
  margin-bottom: 12px;
}

.quoted-box span {
  display: block;
  font-size: 9px;
  color: var(--paper);
}

.quoted-box small {
  display: block;
  font-size: 8px;
  color: var(--muted);
  margin-top: 2px;
}

.inquiry-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.admin-partners-table {
  display: grid;
  gap: 10px;
}

.admin-partner-row {
  background: var(--ink2);
  border: 1px solid var(--line);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.admin-partner-info h4 {
  font: 500 16px var(--serif);
  margin: 0 0 4px;
}

.admin-partner-info p {
  font-size: 9px;
  color: var(--muted);
  margin: 0;
}

.admin-partner-actions {
  display: flex;
  gap: 8px;
}

.reject-reason-box {
  width: 100%;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}

.verified-check {
  font-size: 8px;
  color: var(--leaf);
  margin-left: 8px;
  border: 1px solid var(--leaf);
  padding: 2px 4px;
}

/* Messaging Layout */
.messages-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  border: 1px solid var(--line);
  background: var(--ink2);
  min-height: 520px;
}

.messages-sidebar {
  border-right: 1px solid var(--line);
  background: #131e1c;
}

.messages-sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.messages-sidebar-header h3 {
  font: 500 15px var(--serif);
  margin: 0;
}

.messages-sidebar-header span {
  font-size: 8px;
  color: var(--gold);
}

.conv-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: none;
  border: 0;
  border-bottom: 1px solid #ffffff10;
  text-align: left;
  cursor: pointer;
  transition: 0.2s;
}

.conv-list-item:hover, .conv-list-item.active {
  background: #1a2a26;
}

.conv-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  border: 1px solid var(--gold);
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conv-topline b {
  font-size: 9px;
  color: var(--paper);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-dot {
  background: var(--gold);
  color: var(--ink);
  font-size: 7px;
  font-weight: 700;
  border-radius: 50%;
  padding: 2px 5px;
}

.conv-category {
  display: block;
  font-size: 7px;
  color: var(--gold-lite);
  margin: 1px 0 3px;
}

.conv-snippet {
  font-size: 8px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.thread-main {
  display: flex;
  flex-direction: column;
}

.thread-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 12px;
  background: #14201e;
}

.thread-header h3 {
  font: 500 16px var(--serif);
  margin: 0;
}

.thread-subject {
  font-size: 8px;
  color: var(--muted);
}

.thread-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 380px;
}

.thread-bubble {
  max-width: 75%;
  padding: 12px 14px;
}

.bubble-traveler {
  align-self: flex-end;
  background: var(--gold);
  color: var(--ink);
}

.bubble-partner {
  align-self: flex-start;
  background: #1c2e29;
  color: var(--paper);
  border: 1px solid var(--line);
}

.thread-bubble p {
  font-size: 9px;
  margin: 0 0 4px;
  line-height: 1.5;
}

.thread-bubble small {
  display: block;
  font-size: 7px;
  opacity: 0.7;
}

.thread-input-form {
  padding: 14px 18px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 10px;
  background: #121c1a;
}

.thread-input-form input, .portal-input, .portal-textarea {
  flex: 1;
  background: #0d1514;
  border: 1px solid var(--line);
  padding: 10px 14px;
  color: var(--paper);
  font-size: 10px;
  outline: none;
}

.thread-input-form input:focus, .portal-input:focus, .portal-textarea:focus {
  border-color: var(--gold);
}

/* Travel Pass Document */
.travel-pass-container {
  background: var(--ink2);
  border: 1px solid var(--line);
  padding: clamp(24px, 4vw, 44px);
}

.travel-pass-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  border-bottom: 1px solid var(--line);
  padding-bottom: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.travel-pass-header h2 {
  font: 500 clamp(28px, 4vw, 44px) var(--serif);
  margin: 6px 0;
}

.pass-meta {
  font-size: 9px;
  color: var(--muted);
  margin: 0;
}

.pass-meta b {
  color: var(--paper);
}

.pass-sections-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
  margin-bottom: 24px;
}

.pass-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.pass-itinerary-list {
  display: grid;
  gap: 12px;
}

.pass-itinerary-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #ffffff12;
}

.pass-day-badge {
  font: 700 9px var(--serif);
  color: var(--gold);
  white-space: nowrap;
}

.pass-itinerary-item h4 {
  font: 500 13px var(--serif);
  margin: 0 0 2px;
}

.pass-itinerary-item p {
  font-size: 8px;
  color: var(--muted);
  margin: 0;
}

.pass-packing-list {
  display: grid;
  gap: 8px;
}

.packing-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #111a19;
  border: 1px solid #ffffff10;
  font-size: 8px;
  cursor: pointer;
}

.packing-item.is-checked {
  opacity: 0.6;
  text-decoration: line-through;
}

.packing-cat-tag {
  margin-left: auto;
  font-size: 6px;
  color: var(--gold);
  border: 1px solid #e8a34c44;
  padding: 2px 4px;
}

.pass-emergency-strip {
  background: #162420;
  border: 1px solid var(--line);
  padding: 20px;
}

.emergency-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.emergency-cell b {
  display: block;
  font-size: 9px;
  color: var(--paper);
}

.emergency-phone {
  display: block;
  font-size: 11px;
  color: var(--gold-lite);
  font-family: var(--sans);
  margin-top: 3px;
}

/* Modals */
.portal-modal-backdrop {
  position: fixed;
  inset: 0;
  background: #000000a0;
  backdrop-filter: blur(6px);
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
}

.portal-modal-card {
  background: var(--ink2);
  border: 1px solid var(--line);
  max-width: 480px;
  width: 100%;
  padding: 28px;
}

.portal-modal-card h3 {
  font: 500 22px var(--serif);
  margin: 0 0 8px;
}

.portal-modal-card p {
  font-size: 9px;
  color: var(--muted);
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.empty-message-state {
  padding: 40px;
  text-align: center;
  color: var(--muted);
  font-size: 11px;
}

/* Responsive */
@media(max-width: 900px) {
  .portal-sidebar {
    position: fixed;
    transform: translateX(-101%);
  }
  .portal-sidebar.open {
    transform: translateX(0);
  }
  .portal-scrim.open {
    position: fixed;
    inset: 0;
    background: #00000088;
    z-index: 25;
  }
  .portal-m-topbar {
    display: flex;
  }
  .portal-dashboard-grid, .pass-sections-grid, .messages-layout, .inquiries-grid, .highlights-row, .emergency-grid {
    grid-template-columns: 1fr;
  }
}
`;

fs.appendFileSync('app/globals.css', portalCss);
console.log('Successfully appended portal styles to app/globals.css');
