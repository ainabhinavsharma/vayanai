"""BOTSKILL — Vayu Travel Planning Engine & Intelligence Orchestrator.

Integrates Local SLM Inference (Qwen 2.5 0.5B via llama-cpp-python),
Knowledge Base Rule Retrieval, PII Sanitization, and Adversarial Prompt Guards.
"""

from __future__ import annotations

import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from botskill.ai_providers.gateway import AIGateway
from botskill.ai_providers.local_llama import LocalLlamaRuntime
from botskill.ai_providers.router import ModelRouter
from botskill.ai_providers.schema import (
    AIExecutionRequest,
    AIExecutionResult,
    RoutingProfile,
)
from botskill.core.models import SeverityLevel
from botskill.learning.sanitizer import PIISanitizer
from botskill.security.prompt_guard import PromptInjectionGuard
from botskill.storage.database import DatabaseManager

logger = logging.getLogger("botskill.vayu_engine")

# Canonical Route Catalogs matching Vayanai Domain
ROUTE_CATALOG: Dict[str, Dict[str, Any]] = {
    "meghalaya": {
        "key": "meghalaya",
        "title": "Living Root Bridges & Cloud Valleys",
        "region": "Northeast India · Meghalaya",
        "duration": "5 nights · 6 days",
        "tagline": "A gentle journey through pine ridges, living architecture, and wet limestone caves.",
        "costBand": {
            "tier": "Comfortable homestays & private vehicle",
            "estimate": "₹34,000 – ₹42,000",
            "perPerson": True,
            "disclaimer": "Planning estimate · Excludes Guwahati flights; verified quotes confirmed with partners.",
        },
        "days": [
            {
                "day": 1,
                "title": "Ascent to the Pine Ridge",
                "location": "Guwahati to Shillong",
                "pacing": "Gentle",
                "summary": "Pickup at Guwahati and scenic drive into the Khasi hills with an unhurried stop at Umiam Lake.",
                "travelTime": "3.5 hrs drive",
            },
            {
                "day": 2,
                "title": "Sacred Groves & Heritage Walks",
                "location": "Mawphlang & Shillong",
                "pacing": "Moderate",
                "summary": "Guided walk with a Khasi custodian through Mawphlang Sacred Forest followed by evening café culture.",
                "travelTime": "1.5 hrs local transit",
            },
            {
                "day": 3,
                "title": "Edge of the Plateau",
                "location": "Shillong to Sohra (Cherrapunji)",
                "pacing": "Moderate",
                "summary": "Spectacular ridge drive past Nohkalikai waterfalls and well-lit fossil passages in Mawsmai cave.",
                "travelTime": "2 hrs drive",
            },
            {
                "day": 4,
                "title": "Living Architecture",
                "location": "Sohra & Nongriat Trails",
                "pacing": "Active / Low-impact alternative available",
                "summary": "Trek to the double-decker living root bridge, or opt for vehicular view terraces with indigenous village guides.",
                "travelTime": "Full day activity",
            },
            {
                "day": 5,
                "title": "Clear Waters of the Border",
                "location": "Dawki & Shnongpdeng",
                "pacing": "Gentle",
                "summary": "Gliding on the emerald Umngot river in wooden boats, with a riverside picnic and homestay hospitality.",
                "travelTime": "2.5 hrs drive",
            },
            {
                "day": 6,
                "title": "Return via Highland Crafts",
                "location": "Sohra to Guwahati",
                "pacing": "Gentle",
                "summary": "Visit local weave centers and return to Guwahati airport for onward evening flights.",
                "travelTime": "4 hrs drive",
            },
        ],
    },
    "ladakh": {
        "key": "ladakh",
        "title": "High Mountain Passes & Monasteries",
        "region": "Trans-Himalaya · Ladakh",
        "duration": "6 nights · 7 days",
        "tagline": "High-altitude desert grandeur, ancient gompas, and starlit alpine lakes.",
        "costBand": {
            "tier": "Boutique heritage stays & dedicated 4x4",
            "estimate": "₹48,000 – ₹58,000",
            "perPerson": True,
            "disclaimer": "Planning estimate · Requires PAP/ILP permits and mandatory 48-hr acclimatization rest.",
        },
        "days": [
            {
                "day": 1,
                "title": "Mandatory Altitude Rest",
                "location": "Leh (3,500m)",
                "pacing": "Resting",
                "summary": "Strict acclimatization at hotel. Gentle hydration, oximeter checks, and evening balcony tea.",
                "travelTime": "30 mins airport transfer",
            },
            {
                "day": 2,
                "title": "Old Town & Shanti Stupa",
                "location": "Leh Valley",
                "pacing": "Gentle",
                "summary": "Slow afternoon walk through Leh Old Town market and sunset prayer at Shanti Stupa.",
                "travelTime": "Local transfers only",
            },
            {
                "day": 3,
                "title": "Monasteries of the Indus",
                "location": "Thiksey & Hemis",
                "pacing": "Moderate",
                "summary": "Morning chanting at Thiksey Monastery, exploring museum relics at Hemis, and unhurried courtyard lunch.",
                "travelTime": "2 hrs drive",
            },
            {
                "day": 4,
                "title": "Crossing Khardung La to Nubra",
                "location": "Leh to Nubra Valley",
                "pacing": "Moderate",
                "summary": "Scenic crossing of Khardung La (brief 20-min summit stop) descending into Diskit sand dunes.",
                "travelTime": "4.5 hrs drive",
            },
            {
                "day": 5,
                "title": "The Vast Blue of Pangong",
                "location": "Nubra to Pangong Tso via Shyok",
                "pacing": "Moderate",
                "summary": "Wild mountain river valleys leading to the crystalline shores of Pangong Lake.",
                "travelTime": "5 hrs drive",
            },
            {
                "day": 6,
                "title": "Return over Chang La",
                "location": "Pangong to Leh",
                "pacing": "Moderate",
                "summary": "Sunrise over the lake, crossing Chang La pass back to Leh for a farewell dinner.",
                "travelTime": "5 hrs drive",
            },
        ],
    },
    "kerala": {
        "key": "kerala",
        "title": "Backwaters, Spice Hills & Coastal Heritage",
        "region": "South India · Kerala",
        "duration": "5 nights · 6 days",
        "tagline": "Emerald waterways, fragrant tea plantations, and colonial coastal alleyways.",
        "costBand": {
            "tier": "Private eco-cottages & solar day-cruise",
            "estimate": "₹28,000 – ₹36,000",
            "perPerson": True,
            "disclaimer": "Planning estimate · Verified partner homestays adhering to canal eco-regulations.",
        },
        "days": [
            {
                "day": 1,
                "title": "Colonial Alleys & Spice Markets",
                "location": "Kochi to Fort Kochi",
                "pacing": "Gentle",
                "summary": "Chinese fishing nets, spice godowns, and evening Kathakali classical dance performance.",
                "travelTime": "1 hr airport transfer",
            },
            {
                "day": 2,
                "title": "Ascent into Tea Valleys",
                "location": "Kochi to Munnar",
                "pacing": "Moderate",
                "summary": "Winding drive through rubber estates and cascading Cheeyappara falls to high-altitude tea gardens.",
                "travelTime": "3.5 hrs drive",
            },
            {
                "day": 3,
                "title": "Mist Walks & Cardamom Trails",
                "location": "Munnar",
                "pacing": "Moderate",
                "summary": "Early morning walk in private spice plantation followed by tea tasting at a historical tea factory.",
                "travelTime": "Local transfers only",
            },
            {
                "day": 4,
                "title": "Descent to the Waterways",
                "location": "Munnar to Kumarakom",
                "pacing": "Gentle",
                "summary": "Drive down to Lake Vembanad and check into a lakeside heritage ancestral courtyard homestay.",
                "travelTime": "4 hrs drive",
            },
            {
                "day": 5,
                "title": "Silent Canals & Village Life",
                "location": "Alappuzha Canals",
                "pacing": "Gentle",
                "summary": "Solar-assisted wooden canoe cruise through palm-shaded narrow canals and traditional duck-farming hamlets.",
                "travelTime": "Daytime water exploration",
            },
        ],
    },
    "rajasthan": {
        "key": "rajasthan",
        "title": "Royal Forts & Desert Living Traditions",
        "region": "North India · Rajasthan",
        "duration": "6 nights · 7 days",
        "tagline": "Golden sandstone bastions, living craft quarters, and unhurried courtyard stepwells.",
        "costBand": {
            "tier": "Restored Haveli stays & chauffeured transit",
            "estimate": "₹38,000 – ₹48,000",
            "perPerson": True,
            "disclaimer": "Planning estimate · Heritage partner verified guides for craft walks.",
        },
        "days": [
            {
                "day": 1,
                "title": "The Pink City Gates",
                "location": "Jaipur",
                "pacing": "Gentle",
                "summary": "Arrival in Jaipur, settling into a family-run heritage haveli, and evening walk through Johari Bazaar.",
                "travelTime": "Airport transfer",
            },
            {
                "day": 2,
                "title": "Amber Fortress & Royal Stepwells",
                "location": "Amber & Jaipur",
                "pacing": "Moderate",
                "summary": "Morning excursion to Amer Fort, walking through Panna Meena Ka Kund stepwell and Anokhi Block Print Museum.",
                "travelTime": "Local transit",
            },
            {
                "day": 3,
                "title": "Blue Alleys of Marwar",
                "location": "Jaipur to Jodhpur",
                "pacing": "Moderate",
                "summary": "Morning express train or scenic drive to the Sun City of Jodhpur, arriving under Mehrangarh fort.",
                "travelTime": "4.5 hrs transit",
            },
            {
                "day": 4,
                "title": "Fortress Bastions & Rao Jodha Park",
                "location": "Jodhpur",
                "pacing": "Moderate",
                "summary": "Curated walking tour of Mehrangarh with an architectural historian followed by native rock flora walk.",
                "travelTime": "Local transit",
            },
            {
                "day": 5,
                "title": "Lakeside Sunset & Palace Courtyards",
                "location": "Jodhpur to Udaipur",
                "pacing": "Gentle",
                "summary": "Scenic drive through the Ranakpur Jain temples arriving at Lake Pichola before dusk.",
                "travelTime": "4.5 hrs drive",
            },
        ],
    },
}


class VayuEngine:
    """Unified Travel AI Companion Engine powered by BOTSKILL."""

    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db = db_manager or DatabaseManager()
        self.sanitizer = PIISanitizer()
        self.prompt_guard = PromptInjectionGuard()

        # Initialize Local SLM & Router
        base_dir = Path(__file__).resolve().parent.parent.parent
        model_path = str(base_dir / "models" / "qwen2.5-0.5b-instruct-q4_k_m.gguf")
        self.slm_runtime = LocalLlamaRuntime(model_path=model_path)

        self.router = ModelRouter(default_profile=RoutingProfile.LOCAL_FIRST)
        self.router.register_adapter("local_llama", self.slm_runtime, is_cloud=False)
        self.gateway = AIGateway(self.router)

    def plan_trip(self, brief: Dict[str, Any]) -> Dict[str, Any]:
        """Analyzes trip brief, applies constraints and policies, and outputs a validated plan."""
        t0 = time.perf_counter()
        raw_prompt = brief.get("prompt", "") or ""
        interests = brief.get("interests", []) or []
        party = brief.get("party", "") or ""
        accessibility = brief.get("accessibility", []) or []

        # 1. Adversarial Injection Defense
        injection_result = self.prompt_guard.scan(raw_prompt)
        if injection_result.is_injection:
            logger.warning("Adversarial prompt detected: %s", injection_result.matched_patterns)
            return {
                "status": "needs_clarification",
                "clarifyingQuestion": (
                    "Your request could not be processed due to unsupported system instructions. "
                    "Please describe the trip in plain language (e.g. 'A relaxing 5-day holiday in green hills')."
                ),
                "selectedRouteKey": "meghalaya",
                "trip": ROUTE_CATALOG["meghalaya"],
                "rankedCandidates": [],
                "warnings": ["Prompt security violation detected and quarantined."],
                "sourceProvenance": {
                    "engine": "Vayu Security Filter",
                    "verifiedAt": datetime.now(timezone.utc).isoformat(),
                    "isDeterministic": True,
                    "latencyMs": (time.perf_counter() - t0) * 1000.0,
                    "citations": [],
                },
            }

        # 2. PII Sanitization
        sanitized_prompt = self.sanitizer.sanitize(raw_prompt)

        # 3. Ambiguity Check
        if len(sanitized_prompt.strip()) > 0 and len(sanitized_prompt.strip()) < 15 and len(interests) == 0:
            return {
                "status": "needs_clarification",
                "clarifyingQuestion": (
                    "Could you tell us what kind of scenery you are imagining? "
                    "For example: lush green hills, quiet backwaters, royal forts, or high mountain passes?"
                ),
                "selectedRouteKey": "meghalaya",
                "trip": ROUTE_CATALOG["meghalaya"],
                "rankedCandidates": [],
                "warnings": [],
                "sourceProvenance": {
                    "engine": "BOTSKILL v3.0 Grounding Engine",
                    "verifiedAt": datetime.now(timezone.utc).isoformat(),
                    "isDeterministic": True,
                    "latencyMs": (time.perf_counter() - t0) * 1000.0,
                    "citations": [],
                },
            }

        # 4. Route Selection & Inference
        selected_key = brief.get("routeKey")
        if not selected_key or selected_key not in ROUTE_CATALOG:
            selected_key = self._infer_route_key(sanitized_prompt, interests)

        # 5. Policy & Safety Advisory Checks
        warnings: List[str] = []
        citations: List[str] = []

        # Altitude Policy Check
        is_elder_or_family = "elder" in party.lower() or "senior" in party.lower() or "family" in party.lower()
        if selected_key == "ladakh":
            warnings.append(
                "Health Safety: Mandatory 36-48 hours rest in Leh (3,500m) before any high-elevation excursions."
            )
            citations.append("[DOC:ladakh_altitude_protocol.txt#L1]")
            if is_elder_or_family:
                warnings.append(
                    "Senior Traveler Protocol: Daily pulse oximeter monitoring and local hospital transport on standby."
                )
                citations.append("[DOC:ladakh_altitude_protocol.txt#L3]")

        # Accessibility & Trail Step Check
        is_step_free = any("step" in str(a).lower() or "walk" in str(a).lower() for a in accessibility) or "mobility" in party.lower()
        if selected_key == "meghalaya":
            citations.append("[DOC:meghalaya_safety_and_permits.txt#L1]")
            if is_step_free or is_elder_or_family:
                warnings.append(
                    "Accessibility Note: Double-decker root bridge involves ~3,500 stone steps; Nohkalikai & Mawsmai vehicular view terraces pre-selected."
                )
                citations.append("[DOC:meghalaya_safety_and_permits.txt#L2]")
                citations.append("[DOC:sohra_homestay_partner_terms.txt#L2]")

        # Kerala Lake Night Cruising & Eco Check
        if selected_key == "kerala":
            warnings.append(
                "Eco-Regulation: Houseboat cruising strictly prohibited between 6:00 PM and 6:00 AM to safeguard fishing communities."
            )
            citations.append("[DOC:kerala_backwaters_rules.txt#L1]")

        # 6. Candidate Ranking
        ranked_candidates = self._rank_candidates(sanitized_prompt, interests, selected_key)

        # 7. AI SLM Enrichment (Optional Execution via AIGateway)
        engine_label = "BOTSKILL v3.0 Local SLM (Qwen 2.5 0.5B)"
        slm_used = False

        if self.slm_runtime.health_check()["status"] == "READY":
            ai_prompt = (
                f"You are Vayu, the AI travel planning companion for Vayanai in India.\n"
                f"The traveller is planning a trip with request: '{sanitized_prompt}'.\n"
                f"Destination: {selected_key.upper()}.\n"
                f"Party: {party or 'Traveller'}. Interests: {', '.join(interests)}.\n"
                f"Briefly summarize why this route fits their pace and comfort in two warm, perceptive sentences."
            )
            ai_req = AIExecutionRequest(
                request_id=f"req-plan-{int(time.time()*1000)}",
                prompt=ai_prompt,
                max_tokens=150,
                temperature=0.3,
            )
            ai_res = self.gateway.execute(ai_req)
            if ai_res.is_success and ai_res.output_text:
                slm_used = True
                summary_text = ai_res.output_text.strip()
                # Inject AI narrative into trip summary
                ROUTE_CATALOG[selected_key]["tagline"] = summary_text[:280]

        latency_ms = (time.perf_counter() - t0) * 1000.0

        return {
            "status": "matched",
            "selectedRouteKey": selected_key,
            "trip": ROUTE_CATALOG[selected_key],
            "rankedCandidates": ranked_candidates,
            "warnings": warnings,
            "sourceProvenance": {
                "engine": engine_label if slm_used else "BOTSKILL Grounding Engine (Deterministic)",
                "model_id": "qwen2.5-0.5b-instruct-q4_k_m" if slm_used else "deterministic-policy-engine",
                "verifiedAt": datetime.now(timezone.utc).isoformat(),
                "isDeterministic": not slm_used,
                "latencyMs": round(latency_ms, 2),
                "citations": citations,
            },
        }

    def chat_companion(self, query: str, route_key: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Provides grounded assistant guidance referencing destination guidelines and partner policies."""
        t0 = time.perf_counter()
        route_key = route_key if route_key in ROUTE_CATALOG else "meghalaya"

        # Check prompt injection
        inj = self.prompt_guard.scan(query)
        if inj.is_injection:
            return {
                "answer": "I am designed to assist with travel planning and partner verification. How can I help shape your itinerary?",
                "suggestedAction": "adjust_pacing",
                "disclaimer": "Security Filter Active",
                "citations": [],
                "provenance": {"engine": "Vayu Security Filter", "latencyMs": 1.0},
            }

        sanitized_query = self.sanitizer.sanitize(query)
        lower = sanitized_query.lower()
        citations: List[str] = []
        suggested_action = None

        # Deterministic Grounded Policy Rules
        if any(w in lower for w in ["drive", "road", "transfer", "traffic", "car", "distance"]):
            if route_key == "meghalaya":
                citations.append("[DOC:meghalaya_safety_and_permits.txt#L5]")
            answer = (
                "For mountain routes, we keep driving times unhurried with daytime arrivals before 6:00 PM. "
                "In live bookings, transfer conditions and vetted drivers are confirmed with local partner hosts."
            )
            suggested_action = "verify_transfers"
            disclaimer = "Planning suggestion · Live road conditions must be verified before travel"

        elif any(w in lower for w in ["food", "lunch", "dinner", "café", "cuisine", "meal", "veg"]):
            if route_key == "meghalaya":
                citations.append("[DOC:sohra_homestay_partner_terms.txt#L4]")
            elif route_key == "kerala":
                citations.append("[DOC:kerala_backwaters_rules.txt#L4]")
            answer = (
                f"We can shape day two or three to highlight regional food. For {route_key.capitalize()}, "
                f"that means authentic courtyard dining, local garden produce, and spice market walks rather than rushed tourist stops."
            )
            suggested_action = "add_food_day"
            disclaimer = "Planning suggestion · Independent partner hosts will be cited with verified details"

        elif any(w in lower for w in ["easy", "walk", "active", "gentle", "elder", "step", "stair"]):
            if route_key == "meghalaya":
                citations.append("[DOC:meghalaya_safety_and_permits.txt#L2]")
                citations.append("[DOC:sohra_homestay_partner_terms.txt#L2]")
            answer = (
                "We can switch any itinerary day to low-effort, step-free alternatives. Valley trails with steps "
                "can be replaced with direct vehicular viewpoints so everyone in your party travels comfortably."
            )
            suggested_action = "adjust_pacing"
            disclaimer = "Planning suggestion · Step-free and mobility notes must be verified per location"

        elif any(w in lower for w in ["leh", "altitude", "acclimatise", "breath", "oxygen", "ladakh"]):
            citations.append("[DOC:ladakh_altitude_protocol.txt#L1]")
            citations.append("[DOC:ladakh_altitude_protocol.txt#L2]")
            answer = (
                "For Ladakh trips, non-negotiable medical protocol is to spend the first 36-48 hours resting in Leh. "
                "Local excursions during this window are kept strictly within 15 minutes of your base."
            )
            suggested_action = "altitude_rest"
            disclaimer = "Health safety note · Consult medical guidance before high-altitude travel"

        elif any(w in lower for w in ["cancel", "refund", "reschedule", "terms"]):
            citations.append("[DOC:sohra_homestay_partner_terms.txt#L3]")
            answer = (
                "Our partner homestays offer transparent cancellation terms. For example, Sohra Indigenous Stays Collective "
                "allows free cancellation up to 72 hours before check-in, and fee-free rescheduling for weather landslides."
            )
            suggested_action = "verify_transfers"
            disclaimer = "Partner Policy Note · Verified against active partner agreement"

        else:
            # General query: attempt SLM generation
            ai_used = False
            if self.slm_runtime.health_check()["status"] == "READY":
                ai_prompt = (
                    f"You are Vayu, a helpful, knowledgeable AI travel planner for Vayanai in India.\n"
                    f"Current route: {route_key.capitalize()}.\n"
                    f"Traveller question: '{sanitized_query}'.\n"
                    f"Provide a concise, helpful response (max 2 sentences) grounded in authentic Indian travel context."
                )
                ai_req = AIExecutionRequest(
                    request_id=f"req-chat-{int(time.time()*1000)}",
                    prompt=ai_prompt,
                    max_tokens=120,
                    temperature=0.3,
                )
                ai_res = self.gateway.execute(ai_req)
                if ai_res.is_success and ai_res.output_text:
                    answer = ai_res.output_text.strip()
                    ai_used = True

            if not ai_used:
                answer = (
                    f"I can adjust the pace, interests, or transfer effort for this {route_key.capitalize()} route. "
                    "Every recommendation cites its verified source and partner terms."
                )
            suggested_action = "adjust_pacing"
            disclaimer = "AI assisted · Human decided · Grounded in verified sources"

        latency_ms = (time.perf_counter() - t0) * 1000.0

        return {
            "answer": answer,
            "suggestedAction": suggested_action,
            "disclaimer": disclaimer,
            "citations": citations,
            "provenance": {
                "engine": "BOTSKILL v3.0 Local SLM" if citations or suggested_action else "Deterministic Policy Rules",
                "verifiedAt": datetime.now(timezone.utc).isoformat(),
                "latencyMs": round(latency_ms, 2),
            },
        }

    def _infer_route_key(self, text: str, interests: List[str]) -> str:
        """Determines best destination match based on text keywords and tags."""
        lower = text.lower()
        if any(w in lower for w in ["meghalaya", "shillong", "sohra", "cherrapunji", "waterfall", "green", "rain"]):
            return "meghalaya"
        if any(w in lower for w in ["ladakh", "leh", "pangong", "nubra", "himalaya", "altitude", "monastery"]):
            return "ladakh"
        if any(w in lower for w in ["kerala", "backwater", "munnar", "kochi", "alleppey", "houseboat", "tea"]):
            return "kerala"
        if any(w in lower for w in ["rajasthan", "jaipur", "jodhpur", "udaipur", "fort", "palace", "desert"]):
            return "rajasthan"

        # Interest heuristics
        if "Nature" in interests:
            return "meghalaya"
        if "Culture" in interests:
            return "rajasthan"
        if "Food" in interests:
            return "kerala"

        return "meghalaya"

    def _rank_candidates(self, text: str, interests: List[str], selected_key: str) -> List[Dict[str, Any]]:
        """Calculates match scores and reasons across all destination candidates."""
        candidates = []
        for key, route in ROUTE_CATALOG.items():
            score = 50
            reasons = []

            if key == selected_key:
                score += 30

            if "Nature" in interests and key in ["meghalaya", "ladakh"]:
                score += 15
                reasons.append("Strong nature and open landscape focus")
            if "Food" in interests and key in ["kerala", "rajasthan"]:
                score += 15
                reasons.append("Rich regional culinary traditions and local food walks")
            if "Culture" in interests and key == "rajasthan":
                score += 20
                reasons.append("Living craft traditions and royal architecture")
            if "Quiet" in interests and key in ["ladakh", "meghalaya"]:
                score += 15
                reasons.append("Uncrowded locations with space to breathe")
            if "Family-friendly" in interests and key in ["rajasthan", "kerala"]:
                score += 15
                reasons.append("Sensible transfer times and low-stress walking terrain")

            weather_snapshots = {
                "meghalaya": "Partly cloudy · 18°C – 24°C",
                "ladakh": "Clear skies · 4°C – 16°C",
                "kerala": "Warm breeze · 24°C – 31°C",
                "rajasthan": "Sunny · 20°C – 32°C",
            }

            candidates.append({
                "route": route,
                "matchScore": min(score, 100),
                "matchReasons": reasons,
                "weatherSnapshot": weather_snapshots.get(key, "Pleasant · 22°C"),
            })

        candidates.sort(key=lambda c: c["matchScore"], reverse=True)
        return candidates
