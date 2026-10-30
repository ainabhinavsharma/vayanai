---
name: vayanai-vayu
description: Unified Agent Skill for Vayanai Travel Platform & BOTSKILL Intelligence Engine. Use this skill to evaluate Vayu AI trip planning briefs, test grounded chat, inspect partner booking review queues, verify strict DRAFT_ONLY boundaries, and audit destination policy guidelines.
---

# Vayanai Vayu & BOTSKILL Intelligence Skill

This skill equips any local coding agent to interact with and verify Vayanai's integrated BOTSKILL intelligence engine.

## Core Capabilities

1. **Vayu AI Planning Evaluation**:
   Test natural language trip requests against local SLM inference (Qwen 2.5 0.5B Instruct GGUF) and deterministic policy filters.
   ```powershell
   python -c "from botskill.vayu_engine import VayuEngine; v = VayuEngine(); print(v.plan_trip({'prompt': 'Peaceful 5-day trip in green hills with elderly parents', 'accessibility': ['step-free']}))"
   ```

2. **Partner Inquiry Staging Inspection**:
   Verify that partner inquiries create drafts in the local SQLite ledger under the non-negotiable `DRAFT_ONLY` boundary without sending live emails.
   ```powershell
   python -c "from botskill.storage.database import DatabaseManager; db = DatabaseManager(); repo = db.get_repository(); print('Active Drafts:', [d.subject for d in repo.list_drafts()])"
   ```

3. **Grounded Policy Rule Verification**:
   Inspect active travel policy rules and source document citations (Meghalaya, Ladakh, Kerala, Sohra Homestays).
   ```powershell
   python -c "from botskill.storage.database import DatabaseManager; db = DatabaseManager(); repo = db.get_repository(); print('Active Rules:', len(repo.list_active_rules()))"
   ```

4. **Engine Health & Latency Probe**:
   Query real-time SLM health and latency benchmarks:
   ```powershell
   curl http://127.0.0.1:8765/api/vayanai/status
   ```

5. **Test Suite Execution**:
   Run the full end-to-end Python test suite (78 tests):
   ```powershell
   pytest backend/botskill/tests -v
   ```
   Run the full Next.js Vitest suite (84 tests):
   ```powershell
   npm test
   ```
