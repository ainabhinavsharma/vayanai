/**
 * BOTSKILL Client Adapter for Vayanai.
 *
 * Connects Vayanai's Next.js application to the local BOTSKILL Python FastAPI sidecar
 * running on 127.0.0.1:8765. Implements session/CSRF token management and
 * automatic deterministic fallbacks to local Vayu logic if the sidecar is offline.
 */

import { TripBrief, RouteDetail } from '@/types';
import { PlannerResult, orchestrateVayuPlan } from '@/lib/vayu/planner';
import { ChatAdjustmentResponse, handleVayuChat } from '@/lib/vayu/chat';

export interface GroundedChatResponse extends ChatAdjustmentResponse {
  citations?: string[];
  provenance?: {
    engine: string;
    verifiedAt: string;
    latencyMs?: number;
  };
}

export interface PartnerInquiryPayload {
  travelerName: string;
  travelerEmail: string;
  partnerId: string;
  partnerName: string;
  routeKey: string;
  dates?: string;
  partySize?: number;
  mobilityNotes?: string;
  message?: string;
}

export interface PartnerInquiryResult {
  success: boolean;
  inquiryId: string;
  draftId: string;
  status: string;
  message: string;
  citations: Array<{
    rule_id: string;
    document_id: string;
    document_title: string;
    source_location: string;
    source_quote: string;
  }>;
  draftSummary: {
    subject: string;
    snippet: string;
    stagedToProvider: boolean;
    isApproved: boolean;
  };
}

export interface EngineStatusResult {
  service: string;
  version: string;
  slmRuntime: {
    status: 'READY' | 'NOT_INSTALLED' | 'ERROR';
    provider: string;
    model_path?: string;
  };
  activeRoutes: string[];
  activePolicyRulesCount: number;
  isHalted: boolean;
  draftOnlyEnforced: boolean;
  timestamp: string;
}

class BotskillClient {
  private baseUrl: string;
  private cachedCsrfToken: string | null = null;
  private tokenExpiry = 0;

  constructor() {
    this.baseUrl = process.env.BOTSKILL_URL || 'http://127.0.0.1:8765';
  }

  /**
   * Retrieves or refreshes active CSRF token for mutating loopback requests.
   */
  async getCsrfToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedCsrfToken && this.tokenExpiry > now) {
      return this.cachedCsrfToken;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/auth/session`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2500)
      });

      if (!res.ok) {
        throw new Error(`Failed to retrieve session: ${res.statusText}`);
      }

      const data = await res.json();
      this.cachedCsrfToken = data.csrf_token || '';
      this.tokenExpiry = now + 15 * 60 * 1000; // cache for 15 minutes
      return this.cachedCsrfToken || '';
    } catch (err) {
      return '';
    }
  }

  /**
   * Orchestrates Vayu trip planning with Local SLM, policy constraints, and source citations.
   * Falls back gracefully to deterministic local logic if the sidecar is unreachable.
   */
  async planTrip(brief: TripBrief): Promise<PlannerResult> {
    try {
      const csrf = await this.getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }

      const res = await fetch(`${this.baseUrl}/api/vayanai/plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify(brief),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        return data as PlannerResult;
      }

      console.warn(`[BOTSKILL Client] Plan request returned ${res.status}. Falling back to deterministic plan.`);
    } catch (err) {
      console.warn(`[BOTSKILL Client] Sidecar unreachable (${String(err)}). Using local deterministic fallback.`);
    }

    // Graceful Fallback
    const localFallback = await orchestrateVayuPlan(brief);
    return {
      ...localFallback,
      sourceProvenance: {
        ...localFallback.sourceProvenance,
        engine: 'Vayu Fallback Engine (Local Deterministic - Offline Mode)'
      }
    };
  }

  /**
   * Grounded travel companion chat referencing destination rules and partner terms.
   * Falls back to deterministic rule-based answers if sidecar is offline.
   */
  async chatVayu(
    message: string,
    routeKey: string,
    context?: Record<string, any>
  ): Promise<GroundedChatResponse> {
    try {
      const csrf = await this.getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }

      const res = await fetch(`${this.baseUrl}/api/vayanai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, routeKey, context: context || {} }),
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        return data as GroundedChatResponse;
      }

      console.warn(`[BOTSKILL Client] Chat request returned ${res.status}. Falling back to deterministic chat.`);
    } catch (err) {
      console.warn(`[BOTSKILL Client] Sidecar unreachable (${String(err)}). Using local deterministic fallback.`);
    }

    const localChat = handleVayuChat(message, routeKey);
    return {
      ...localChat,
      citations: [],
      provenance: {
        engine: 'Deterministic Rule Engine (Offline Fallback)',
        verifiedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Creates a partner inquiry message and stages a draft reply under DRAFT_ONLY invariants.
   */
  async createPartnerInquiry(payload: PartnerInquiryPayload): Promise<PartnerInquiryResult> {
    const csrf = await this.getCsrfToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }

    const res = await fetch(`${this.baseUrl}/api/vayanai/inquire`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`Failed to stage partner inquiry: ${res.status} ${res.statusText}`);
    }

    return (await res.json()) as PartnerInquiryResult;
  }

  /**
   * Probes sidecar operational health, SLM readiness, and policy rule counts.
   */
  async getEngineStatus(): Promise<EngineStatusResult | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/vayanai/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2000)
      });

      if (res.ok) {
        return (await res.json()) as EngineStatusResult;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Lists drafts from the supervision queue.
   */
  async listDrafts(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/drafts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Stages an approved draft to Outlook Drafts or Mock Outbox.
   */
  async stageDraft(draftId: string): Promise<any> {
    const csrf = await this.getCsrfToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }

    const res = await fetch(`${this.baseUrl}/api/drafts/${encodeURIComponent(draftId)}/stage`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`Failed to stage draft: ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Lists connected and auto-discovered email accounts.
   */
  async listAccounts(): Promise<{ accounts: any[]; total: number; monitored_domain: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/accounts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        return await res.json();
      }
      return {
        accounts: [
          { account_id: 'partners@vayanai.in.net', display_name: 'Vayanai Local Partner Network', provider: 'Windows COM MAPI', status: 'READY', autonomy_level: 'LEVEL_1_DRAFT_ONLY', is_default: true, domain: 'vayanai.in.net' },
          { account_id: 'bookings@vayanai.in.net', display_name: 'Vayanai Booking & Itinerary Desk', provider: 'Windows COM MAPI', status: 'READY', autonomy_level: 'LEVEL_1_DRAFT_ONLY', is_default: false, domain: 'vayanai.in.net' },
          { account_id: 'support@vayanai.in.net', display_name: 'Vayanai Emergency & Traveler Support', provider: 'Windows COM MAPI', status: 'READY', autonomy_level: 'LEVEL_1_DRAFT_ONLY', is_default: false, domain: 'vayanai.in.net' }
        ],
        total: 3,
        monitored_domain: 'vayanai.in.net'
      };
    } catch {
      return {
        accounts: [
          { account_id: 'partners@vayanai.in.net', display_name: 'Vayanai Local Partner Network', provider: 'Offline Fallback', status: 'STANDBY', autonomy_level: 'LEVEL_1_DRAFT_ONLY', is_default: true, domain: 'vayanai.in.net' }
        ],
        total: 1,
        monitored_domain: 'vayanai.in.net'
      };
    }
  }

  /**
   * Registers a new email address for local mailbox monitoring.
   */
  async addAccount(email: string, displayName?: string): Promise<any> {
    const csrf = await this.getCsrfToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;

    const res = await fetch(`${this.baseUrl}/api/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, display_name: displayName, autonomy_level: 'LEVEL_1_DRAFT_ONLY' }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to add account: ${res.status}`);
    }
    return await res.json();
  }

  /**
   * Forces discovery and auto-picking of any newly added email accounts in Outlook.
   */
  async discoverOutlookAccounts(): Promise<{ newly_picked: string[]; total_monitored: number; accounts: any[] }> {
    const csrf = await this.getCsrfToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;

    try {
      const res = await fetch(`${this.baseUrl}/api/accounts/discover`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        return await res.json();
      }
      return { newly_picked: [], total_monitored: 0, accounts: [] };
    } catch {
      return { newly_picked: [], total_monitored: 0, accounts: [] };
    }
  }

  /**
   * Lists all policy rules currently loaded in BOTSKILL knowledge store.
   */
  async listPolicyRules(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/knowledge/rules`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Creates a new company operational policy or safety guardrail rule.
   */
  async createPolicyRule(rule: {
    title: string;
    condition: string;
    required_action: string;
    prohibited_actions?: string[];
    severity?: string;
    rule_type?: string;
  }): Promise<any> {
    const csrf = await this.getCsrfToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;

    const res = await fetch(`${this.baseUrl}/api/knowledge/rules`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: rule.title,
        condition: rule.condition,
        required_action: rule.required_action,
        prohibited_actions: rule.prohibited_actions || [],
        severity: rule.severity || 'HIGH',
        rule_type: rule.rule_type || 'MANDATORY_POLICY',
        source_document_id: 'doc_vayanai_admin_policy',
        source_location: 'Admin Supervision Desk',
        source_quote: rule.required_action,
        is_active: true
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create policy rule: ${res.status}`);
    }
    return await res.json();
  }
}

export const botskillClient = new BotskillClient();
