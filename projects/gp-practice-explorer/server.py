"""
GP Practice Explorer - MCP Server
Exposes GP practice sales intelligence data to Claude AI via the
Model Context Protocol (MCP) over HTTP with API key authentication.
"""

import csv
import json
import os
import re
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from ddgs import DDGS
from mcp.server.fastmcp import FastMCP
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_KEY = os.getenv("MCP_API_KEY", "")
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))

# ---------------------------------------------------------------------------
# Load data at startup (in-memory for fast queries)
# ---------------------------------------------------------------------------

def _load_data() -> dict[str, Any]:
    """Load all data files into memory and build enriched practice records."""

    # 1. CSV – core practice data
    practices: dict[str, dict] = {}
    csv_path = DATA_DIR / "PracticeandListSize_Updated.csv"
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row["PRACTICE_ID"].strip()
            # Collect GP partners (up to 10)
            partners = []
            for i in range(1, 11):
                name = row.get(f"GP_PARTNER_{i}", "").strip()
                if name:
                    partners.append({
                        "name": name,
                        "email": row.get(f"GP_PARTNER_{i}_EMAIL", "").strip() or None,
                        "linkedin": row.get(f"GP_PARTNER_{i}_LINKEDIN", "").strip() or None,
                        "facebook": row.get(f"GP_PARTNER_{i}_FACEBOOK", "").strip() or None,
                    })
            practices[pid] = {
                "practice_id": pid,
                "pcn_name": row["PCN_NAME"].strip(),
                "icb_name": row["ICB_NAME_FORMATED"].strip(),
                "clinical_system": row["CLINICAL_SYSTEM"].strip(),
                "number_of_patients": int(row["NUMBER_OF_PATIENTS"]) if row["NUMBER_OF_PATIENTS"].strip().isdigit() else 0,
                "website": row["WEBSITE"].strip() or None,
                "gp_partners": partners,
                # enriched later
                "status": "cold_lead",
                "lead_score": 1,
                "is_customer": False,
            }

    # Note: GP_PARTNER_N_LINKEDIN column sometimes contains a LinkedIn URL
    # (e.g. https://uk.linkedin.com/in/...) and sometimes an additional partner
    # name that overflowed from the name columns. We normalise this here:
    for pid, practice in practices.items():
        normalised_partners = []
        for partner in practice["gp_partners"]:
            li = partner.get("linkedin")
            if li and not li.lower().startswith("http"):
                # It's actually another partner name, not a LinkedIn URL
                # Keep the original partner and add the extra name as a separate
                # partner record with no contact info (to avoid losing the data)
                partner["linkedin"] = None
                partner["linkedin_extra_name"] = li  # preserve for reference
            normalised_partners.append(partner)
        practice["gp_partners"] = normalised_partners

    # 2. customer_data.json – statuses, customer lists
    customer_path = DATA_DIR / "customer_data.json"
    with open(customer_path, encoding="utf-8") as f:
        customer_data = json.load(f)

    customer_ods_codes: set[str] = set(customer_data.get("customer_ods_codes", []))
    customer_pcns: set[str] = set(customer_data.get("customer_pcns", []))
    customer_icbs: set[str] = set(customer_data.get("customer_icbs", []))
    lead_data: dict[str, dict] = customer_data.get("lead_data", {})

    # Enrich practices with lead status
    for pid, practice in practices.items():
        # Extract ODS code (e.g. "A81001" from "A81001 - THE DENSHAM SURGERY")
        ods_match = re.match(r"^([A-Z0-9]+)", pid)
        ods_code = ods_match.group(1) if ods_match else None

        if ods_code and ods_code in customer_ods_codes:
            practice["status"] = "customer"
            practice["is_customer"] = True
            practice["lead_score"] = 10
        elif pid in lead_data:
            ld = lead_data[pid]
            practice["status"] = ld.get("status", "cold_lead")
            practice["lead_score"] = ld.get("lead_score", 1)
        else:
            practice["status"] = "cold_lead"
            practice["lead_score"] = 1

    # 3. icb_priorities.json
    icb_path = DATA_DIR / "icb_priorities.json"
    with open(icb_path, encoding="utf-8") as f:
        icb_priorities: dict[str, dict] = json.load(f)

    # 4. pcn_stats.json
    pcn_path = DATA_DIR / "pcn_stats.json"
    with open(pcn_path, encoding="utf-8") as f:
        pcn_stats: dict[str, dict] = json.load(f)

    return {
        "practices": practices,
        "customer_ods_codes": customer_ods_codes,
        "customer_pcns": customer_pcns,
        "customer_icbs": customer_icbs,
        "icb_priorities": icb_priorities,
        "pcn_stats": pcn_stats,
    }


print("Loading GP practice data...")
DATA = _load_data()
PRACTICES = DATA["practices"]
CUSTOMER_ODS = DATA["customer_ods_codes"]
CUSTOMER_PCNS = DATA["customer_pcns"]
CUSTOMER_ICBS = DATA["customer_icbs"]
ICB_PRIORITIES = DATA["icb_priorities"]
PCN_STATS = DATA["pcn_stats"]
print(f"Loaded {len(PRACTICES)} practices.")

# ---------------------------------------------------------------------------
# Build a global GP partner index for fast name lookups
# ---------------------------------------------------------------------------
# GP_PARTNER_INDEX: name_lower -> list of {name, practice_id, email, linkedin, facebook}
GP_PARTNER_INDEX: dict[str, list[dict]] = {}
for _pid, _practice in PRACTICES.items():
    for _partner in _practice["gp_partners"]:
        _name_lower = _partner["name"].lower().strip()
        if _name_lower not in GP_PARTNER_INDEX:
            GP_PARTNER_INDEX[_name_lower] = []
        GP_PARTNER_INDEX[_name_lower].append({
            "name": _partner["name"],
            "practice_id": _pid,
            "practice_status": _practice["status"],
            "practice_pcn": _practice["pcn_name"],
            "practice_icb": _practice["icb_name"],
            "email": _partner.get("email"),
            "linkedin": _partner.get("linkedin"),
            "facebook": _partner.get("facebook"),
            "website": _practice.get("website"),
        })
print(f"Indexed {len(GP_PARTNER_INDEX)} unique GP partner names.")


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _practice_summary(p: dict) -> dict:
    """Return a concise summary of a practice record."""
    return {
        "practice_id": p["practice_id"],
        "pcn_name": p["pcn_name"],
        "icb_name": p["icb_name"],
        "clinical_system": p["clinical_system"],
        "number_of_patients": p["number_of_patients"],
        "status": p["status"],
        "lead_score": p["lead_score"],
        "website": p["website"],
        "gp_partners": [gp["name"] for gp in p["gp_partners"]],
    }


def _practice_full(p: dict) -> dict:
    """Return the full practice record including GP partner contact details."""
    return {
        "practice_id": p["practice_id"],
        "pcn_name": p["pcn_name"],
        "icb_name": p["icb_name"],
        "clinical_system": p["clinical_system"],
        "number_of_patients": p["number_of_patients"],
        "status": p["status"],
        "lead_score": p["lead_score"],
        "website": p["website"],
        "gp_partners": p["gp_partners"],
    }


def _size_bucket(n: int) -> str:
    if n < 10000:
        return "<10k"
    elif n < 20000:
        return "10k-20k"
    elif n < 30000:
        return "20k-30k"
    else:
        return "30k+"


# ---------------------------------------------------------------------------
# MCP Server
# ---------------------------------------------------------------------------
mcp = FastMCP(
    "GP Practice Explorer",
    instructions=(
        "You are a sales intelligence assistant for GP Automate. "
        "Use these tools to explore UK GP practices, identify leads, "
        "and analyse sales opportunities across Primary Care Networks (PCNs) "
        "and Integrated Care Boards (ICBs). "
        "Always present data clearly and highlight actionable insights."
    ),
)


# ── Tool 1: Search practices ─────────────────────────────────────────────────
@mcp.tool()
def search_practices(
    query: str = "",
    status: str = "all",
    clinical_system: str = "all",
    size: str = "all",
    icb_name: str = "",
    pcn_name: str = "",
    limit: int = 20,
) -> dict:
    """
    Search and filter GP practices.

    Args:
        query: Free-text search across practice name, ODS code, and GP partner names.
        status: Filter by lead status. Options: 'all', 'customer', 'warm_lead_pcn',
                'cold_lead', 'hot_lead'. Default 'all'.
        clinical_system: Filter by clinical system. Options: 'all', 'EMIS Web',
                         'SystmOne', 'mixed'. Default 'all'.
        size: Filter by patient list size. Options: 'all', '<10k', '10k-20k',
              '20k-30k', '30k+'. Default 'all'.
        icb_name: Partial or full ICB name to filter by (case-insensitive).
        pcn_name: Partial or full PCN name to filter by (case-insensitive).
        limit: Maximum number of results to return (default 20, max 100).

    Returns:
        A dict with 'total_matched' and 'practices' list.
    """
    limit = min(limit, 100)
    query_lower = query.lower().strip()
    icb_lower = icb_name.lower().strip()
    pcn_lower = pcn_name.lower().strip()

    results = []
    for p in PRACTICES.values():
        # Status filter
        if status != "all":
            if status == "hot_lead":
                # Hot leads are warm_lead_pcn practices in PCNs with high penetration
                pcn = PCN_STATS.get(p["pcn_name"], {})
                if not (p["status"] == "warm_lead_pcn" and pcn.get("penetration", 0) >= 50):
                    continue
            elif p["status"] != status:
                continue

        # Clinical system filter
        if clinical_system != "all":
            if clinical_system.lower() not in p["clinical_system"].lower():
                continue

        # Size filter
        if size != "all":
            if _size_bucket(p["number_of_patients"]) != size:
                continue

        # ICB filter
        if icb_lower and icb_lower not in p["icb_name"].lower():
            continue

        # PCN filter
        if pcn_lower and pcn_lower not in p["pcn_name"].lower():
            continue

        # Free-text query
        if query_lower:
            searchable = (
                p["practice_id"].lower()
                + " " + p["pcn_name"].lower()
                + " " + p["icb_name"].lower()
                + " " + " ".join(gp["name"].lower() for gp in p["gp_partners"])
            )
            if query_lower not in searchable:
                continue

        results.append(_practice_summary(p))

    results.sort(key=lambda x: -x["lead_score"])
    return {
        "total_matched": len(results),
        "showing": min(len(results), limit),
        "practices": results[:limit],
    }


# ── Tool 2: Get practice detail ───────────────────────────────────────────────
@mcp.tool()
def get_practice_detail(practice_id: str) -> dict:
    """
    Get full details for a specific GP practice, including all GP partner
    contact information (email, LinkedIn, Facebook).

    Args:
        practice_id: The full practice ID string, e.g. 'A81001 - THE DENSHAM SURGERY',
                     or just the ODS code prefix e.g. 'A81001'.

    Returns:
        Full practice record, or an error message if not found.
    """
    pid = practice_id.strip()

    # Exact match first
    if pid in PRACTICES:
        return _practice_full(PRACTICES[pid])

    # Try ODS code prefix match
    pid_upper = pid.upper()
    for key, p in PRACTICES.items():
        if key.startswith(pid_upper + " ") or key.startswith(pid_upper + "-"):
            return _practice_full(p)

    # Fuzzy name match
    pid_lower = pid.lower()
    matches = [p for key, p in PRACTICES.items() if pid_lower in key.lower()]
    if len(matches) == 1:
        return _practice_full(matches[0])
    elif len(matches) > 1:
        return {
            "error": f"Multiple matches found for '{practice_id}'. Please be more specific.",
            "matches": [m["practice_id"] for m in matches[:10]],
        }

    return {"error": f"Practice '{practice_id}' not found."}


# ── Tool 3: Get PCN details ───────────────────────────────────────────────────
@mcp.tool()
def get_pcn_details(pcn_name: str) -> dict:
    """
    Get full details about a Primary Care Network (PCN), including all member
    practices, customer penetration rate, and lead opportunities.

    Args:
        pcn_name: Full or partial PCN name (case-insensitive).

    Returns:
        PCN stats, member practices, and a breakdown by status.
    """
    pcn_lower = pcn_name.lower().strip()

    # Find matching PCN names
    matching_pcns = [k for k in PCN_STATS if pcn_lower in k.lower()]
    if not matching_pcns:
        return {"error": f"No PCN found matching '{pcn_name}'."}
    if len(matching_pcns) > 5:
        return {
            "error": f"Too many PCNs matched '{pcn_name}'. Please be more specific.",
            "matches": matching_pcns[:10],
        }

    results = []
    for pcn in matching_pcns:
        stats = PCN_STATS.get(pcn, {})
        members = [p for p in PRACTICES.values() if p["pcn_name"] == pcn]
        members.sort(key=lambda x: -x["lead_score"])

        icb = stats.get("icb", members[0]["icb_name"] if members else "Unknown")
        icb_priority = ICB_PRIORITIES.get(icb, {})

        results.append({
            "pcn_name": pcn,
            "icb_name": icb,
            "icb_category": icb_priority.get("label", "Unknown"),
            "icb_performance": icb_priority.get("performance", None),
            "total_practices": stats.get("total", len(members)),
            "customers": stats.get("customers", 0),
            "penetration_pct": round(stats.get("penetration", 0), 1),
            "pcn_status": stats.get("status", "cold"),
            "practices": [_practice_summary(m) for m in members],
        })

    if len(results) == 1:
        return results[0]
    return {"pcns": results}


# ── Tool 4: Find expansion opportunities ─────────────────────────────────────
@mcp.tool()
def find_expansion_opportunities(practice_id: str) -> dict:
    """
    Given a customer practice, find all other practices in the same PCN
    that are not yet customers. These are the highest-priority warm leads
    because they share a network with an existing customer.

    Args:
        practice_id: ODS code or full practice ID of an existing customer.

    Returns:
        The customer's PCN and a list of non-customer practices in that PCN.
    """
    pid = practice_id.strip()

    # Resolve practice
    practice = None
    if pid in PRACTICES:
        practice = PRACTICES[pid]
    else:
        pid_upper = pid.upper()
        for key, p in PRACTICES.items():
            if key.startswith(pid_upper + " ") or key.upper().startswith(pid_upper + " "):
                practice = p
                break

    if not practice:
        return {"error": f"Practice '{practice_id}' not found."}

    if not practice["is_customer"]:
        return {
            "warning": f"'{practice['practice_id']}' is not a customer (status: {practice['status']}). "
                       "Showing all other practices in the same PCN anyway.",
            "practice": practice["practice_id"],
            "pcn": practice["pcn_name"],
        }

    pcn = practice["pcn_name"]
    pcn_stats = PCN_STATS.get(pcn, {})
    opportunities = [
        _practice_summary(p)
        for p in PRACTICES.values()
        if p["pcn_name"] == pcn and not p["is_customer"]
    ]
    opportunities.sort(key=lambda x: -x["lead_score"])

    return {
        "customer_practice": practice["practice_id"],
        "pcn_name": pcn,
        "pcn_penetration_pct": round(pcn_stats.get("penetration", 0), 1),
        "total_in_pcn": pcn_stats.get("total", 0),
        "customers_in_pcn": pcn_stats.get("customers", 0),
        "non_customer_opportunities": len(opportunities),
        "opportunities": opportunities,
    }


# ── Tool 5: Get ICB summary ───────────────────────────────────────────────────
@mcp.tool()
def get_icb_summary(icb_name: str = "") -> dict:
    """
    Get a summary of all Integrated Care Boards (ICBs), or drill into a
    specific ICB to see customer penetration, PCN breakdown, and priority
    category. Useful for regional sales planning.

    Args:
        icb_name: Full or partial ICB name. Leave blank to list all ICBs
                  with their priority categories and customer counts.

    Returns:
        ICB summary with customer counts, PCN breakdown, and priority info.
    """
    if not icb_name.strip():
        # Return all ICBs with summary stats
        icb_stats: dict[str, dict] = {}
        for p in PRACTICES.values():
            icb = p["icb_name"]
            if icb not in icb_stats:
                icb_stats[icb] = {
                    "icb_name": icb,
                    "total_practices": 0,
                    "customers": 0,
                    "warm_leads": 0,
                    "cold_leads": 0,
                    "priority": ICB_PRIORITIES.get(icb, {}).get("label", "Unknown"),
                    "performance_pct": ICB_PRIORITIES.get(icb, {}).get("performance", None),
                }
            icb_stats[icb]["total_practices"] += 1
            if p["is_customer"]:
                icb_stats[icb]["customers"] += 1
            elif p["status"] == "warm_lead_pcn":
                icb_stats[icb]["warm_leads"] += 1
            else:
                icb_stats[icb]["cold_leads"] += 1

        # Add penetration %
        for icb in icb_stats.values():
            t = icb["total_practices"]
            icb["penetration_pct"] = round(icb["customers"] / t * 100, 1) if t else 0

        sorted_icbs = sorted(icb_stats.values(), key=lambda x: -(x.get("performance_pct") or 0))
        return {
            "total_icbs": len(sorted_icbs),
            "icbs": sorted_icbs,
        }

    # Drill into a specific ICB
    icb_lower = icb_name.lower().strip()
    matching = [k for k in ICB_PRIORITIES if icb_lower in k.lower()]
    if not matching:
        # Try from practice data
        matching = list({p["icb_name"] for p in PRACTICES.values() if icb_lower in p["icb_name"].lower()})

    if not matching:
        return {"error": f"No ICB found matching '{icb_name}'."}

    target_icb = matching[0]
    priority_info = ICB_PRIORITIES.get(target_icb, {})

    practices_in_icb = [p for p in PRACTICES.values() if p["icb_name"] == target_icb]
    pcn_breakdown: dict[str, dict] = {}
    for p in practices_in_icb:
        pcn = p["pcn_name"]
        if pcn not in pcn_breakdown:
            pcn_breakdown[pcn] = {"pcn_name": pcn, "total": 0, "customers": 0, "warm_leads": 0}
        pcn_breakdown[pcn]["total"] += 1
        if p["is_customer"]:
            pcn_breakdown[pcn]["customers"] += 1
        elif p["status"] == "warm_lead_pcn":
            pcn_breakdown[pcn]["warm_leads"] += 1

    total = len(practices_in_icb)
    customers = sum(1 for p in practices_in_icb if p["is_customer"])

    return {
        "icb_name": target_icb,
        "priority_category": priority_info.get("label", "Unknown"),
        "performance_pct": priority_info.get("performance", None),
        "total_practices": total,
        "customers": customers,
        "penetration_pct": round(customers / total * 100, 1) if total else 0,
        "warm_leads": sum(1 for p in practices_in_icb if p["status"] == "warm_lead_pcn"),
        "cold_leads": sum(1 for p in practices_in_icb if p["status"] == "cold_lead"),
        "pcn_breakdown": sorted(pcn_breakdown.values(), key=lambda x: -x["customers"]),
    }


# ── Tool 6: Get statistics overview ──────────────────────────────────────────
@mcp.tool()
def get_statistics_overview() -> dict:
    """
    Get a high-level statistics overview of the entire GP practice database.
    Returns total counts of customers, warm leads, cold leads, hot PCNs,
    total patients covered, and top ICBs by customer count.

    Returns:
        A summary statistics dict.
    """
    total = len(PRACTICES)
    customers = sum(1 for p in PRACTICES.values() if p["is_customer"])
    warm_leads = sum(1 for p in PRACTICES.values() if p["status"] == "warm_lead_pcn")
    cold_leads = sum(1 for p in PRACTICES.values() if p["status"] == "cold_lead")
    total_patients = sum(p["number_of_patients"] for p in PRACTICES.values())
    customer_patients = sum(p["number_of_patients"] for p in PRACTICES.values() if p["is_customer"])

    hot_pcns = [
        {"pcn_name": k, "penetration_pct": round(v["penetration"], 1), "customers": v["customers"], "total": v["total"]}
        for k, v in PCN_STATS.items()
        if v.get("status") == "hot" or v.get("penetration", 0) >= 50
    ]
    hot_pcns.sort(key=lambda x: -x["penetration_pct"])

    warm_pcns = [
        {"pcn_name": k, "penetration_pct": round(v["penetration"], 1), "customers": v["customers"], "total": v["total"]}
        for k, v in PCN_STATS.items()
        if v.get("status") == "warm"
    ]
    warm_pcns.sort(key=lambda x: -x["penetration_pct"])

    # Top ICBs by customer count
    icb_customer_counts: dict[str, int] = {}
    for p in PRACTICES.values():
        if p["is_customer"]:
            icb_customer_counts[p["icb_name"]] = icb_customer_counts.get(p["icb_name"], 0) + 1
    top_icbs = sorted(icb_customer_counts.items(), key=lambda x: -x[1])[:10]

    return {
        "total_practices": total,
        "total_networks_pcns": len(PCN_STATS),
        "total_icbs": len(ICB_PRIORITIES),
        "total_patients_uk": total_patients,
        "customers": {
            "count": customers,
            "patient_coverage": customer_patients,
            "pct_of_all_practices": round(customers / total * 100, 1),
        },
        "warm_leads": warm_leads,
        "cold_leads": cold_leads,
        "hot_pcns": hot_pcns[:10],
        "warm_pcns": warm_pcns[:10],
        "top_icbs_by_customers": [{"icb": k, "customers": v} for k, v in top_icbs],
    }


# ── Tool 7: Get lead context ──────────────────────────────────────────────────
@mcp.tool()
def get_lead_context(practice_id: str) -> dict:
    """
    Explain why a practice is classified as a hot lead, warm lead, customer,
    or cold lead. Provides the PCN context, nearby customers, and suggested
    next actions.

    Args:
        practice_id: ODS code or full practice ID string.

    Returns:
        Lead classification context and recommended actions.
    """
    pid = practice_id.strip()

    # Resolve practice
    practice = None
    if pid in PRACTICES:
        practice = PRACTICES[pid]
    else:
        pid_upper = pid.upper()
        for key, p in PRACTICES.items():
            if key.upper().startswith(pid_upper + " ") or key.upper().startswith(pid_upper + "-"):
                practice = p
                break

    if not practice:
        return {"error": f"Practice '{practice_id}' not found."}

    pcn = practice["pcn_name"]
    pcn_stats = PCN_STATS.get(pcn, {})
    icb = practice["icb_name"]
    icb_priority = ICB_PRIORITIES.get(icb, {})

    # Find customers in same PCN
    customers_in_pcn = [
        p["practice_id"] for p in PRACTICES.values()
        if p["pcn_name"] == pcn and p["is_customer"]
    ]

    # Determine reason for classification
    status = practice["status"]
    if status == "customer":
        reason = "This practice is an existing customer."
        actions = ["Schedule a review call.", "Look for upsell opportunities.", "Use as a reference for other practices in the PCN."]
    elif status == "warm_lead_pcn":
        penetration = round(pcn_stats.get("penetration", 0), 1)
        reason = (
            f"This practice is in {pcn}, which already has {len(customers_in_pcn)} customer(s) "
            f"({penetration}% penetration). Practices in the same PCN as existing customers "
            "are classified as warm leads because they share governance, meetings, and peer influence."
        )
        actions = [
            f"Reference existing customers in {pcn} when reaching out.",
            "Ask your existing customer contacts to make an introduction.",
            "Highlight PCN-wide benefits and shared outcomes.",
        ]
    elif status == "cold_lead":
        reason = "No customers in this practice's PCN yet. This is a cold lead with no existing network presence."
        actions = [
            "Consider targeting this ICB as part of a regional campaign.",
            f"Check if the ICB ({icb}) has any nearby warm PCNs to prioritise first.",
            "Use GP partner contact details to initiate outreach.",
        ]
    else:
        reason = f"Status: {status}"
        actions = []

    return {
        "practice_id": practice["practice_id"],
        "status": status,
        "lead_score": practice["lead_score"],
        "pcn_name": pcn,
        "pcn_penetration_pct": round(pcn_stats.get("penetration", 0), 1),
        "customers_in_same_pcn": customers_in_pcn,
        "icb_name": icb,
        "icb_priority": icb_priority.get("label", "Unknown"),
        "classification_reason": reason,
        "recommended_actions": actions,
        "gp_partners": practice["gp_partners"],
        "website": practice["website"],
    }


# ── Tool 8: List top opportunities ───────────────────────────────────────────
@mcp.tool()
def list_top_opportunities(
    icb_name: str = "",
    clinical_system: str = "all",
    limit: int = 20,
) -> dict:
    """
    List the highest-priority sales opportunities — warm leads in high-priority
    ICBs, sorted by PCN penetration (most penetrated PCNs first, as these are
    easiest to close via peer referral).

    Args:
        icb_name: Optional ICB name filter (partial match, case-insensitive).
        clinical_system: Optional clinical system filter ('all', 'EMIS Web', 'SystmOne').
        limit: Number of results to return (default 20, max 100).

    Returns:
        Ranked list of warm lead practices with context.
    """
    limit = min(limit, 100)
    icb_lower = icb_name.lower().strip()

    candidates = []
    for p in PRACTICES.values():
        if p["status"] not in ("warm_lead_pcn",):
            continue
        if icb_lower and icb_lower not in p["icb_name"].lower():
            continue
        if clinical_system != "all" and clinical_system.lower() not in p["clinical_system"].lower():
            continue

        pcn = p["pcn_name"]
        pcn_stat = PCN_STATS.get(pcn, {})
        icb_priority = ICB_PRIORITIES.get(p["icb_name"], {})

        candidates.append({
            **_practice_summary(p),
            "pcn_penetration_pct": round(pcn_stat.get("penetration", 0), 1),
            "customers_in_pcn": pcn_stat.get("customers", 0),
            "icb_priority_category": icb_priority.get("label", "Unknown"),
            "icb_performance_pct": icb_priority.get("performance", 0),
        })

    # Sort: highest PCN penetration first, then ICB performance
    candidates.sort(key=lambda x: (-x["pcn_penetration_pct"], -(x.get("icb_performance_pct") or 0)))

    return {
        "total_opportunities": len(candidates),
        "showing": min(len(candidates), limit),
        "opportunities": candidates[:limit],
    }


# ── Tool 9: Search GP partners ───────────────────────────────────────────────
@mcp.tool()
def search_gp_partners(
    name: str = "",
    practice_id: str = "",
    missing_field: str = "any",
    limit: int = 20,
) -> dict:
    """
    Search for GP partners (doctors) across all practices by name or practice.
    Can filter to show only partners with missing contact data.

    Args:
        name: Partial or full GP partner name to search for (case-insensitive).
        practice_id: Filter to partners at a specific practice (ODS code or full ID).
        missing_field: Show only partners missing a specific field.
                       Options: 'any' (all partners), 'email', 'linkedin',
                       'facebook', 'all_contact' (missing everything).
        limit: Maximum results to return (default 20, max 100).

    Returns:
        List of matching GP partner records with their practice context.
    """
    limit = min(limit, 100)
    name_lower = name.lower().strip()
    pid_lower = practice_id.lower().strip()

    results = []
    for key, entries in GP_PARTNER_INDEX.items():
        # Name filter
        if name_lower and name_lower not in key:
            continue
        for entry in entries:
            # Practice filter
            if pid_lower and pid_lower not in entry["practice_id"].lower():
                continue
            # Missing field filter
            if missing_field == "email" and entry.get("email"):
                continue
            elif missing_field == "linkedin" and entry.get("linkedin"):
                continue
            elif missing_field == "facebook" and entry.get("facebook"):
                continue
            elif missing_field == "all_contact":
                if entry.get("email") or entry.get("linkedin") or entry.get("facebook"):
                    continue
            results.append(entry)

    results.sort(key=lambda x: x["name"])
    return {
        "total_matched": len(results),
        "showing": min(len(results), limit),
        "partners": results[:limit],
    }


# ── Tool 10: Get GP partner profile ──────────────────────────────────────────
@mcp.tool()
def get_gp_partner_profile(name: str) -> dict:
    """
    Get the full profile for a specific GP partner, including all contact
    details stored in the dashboard and which practice(s) they are linked to.
    Also reports which contact fields are missing.

    Args:
        name: Full or partial GP partner name (case-insensitive).

    Returns:
        Partner profile(s) with contact completeness summary.
    """
    name_lower = name.lower().strip()

    # Exact match first
    exact = GP_PARTNER_INDEX.get(name_lower, [])
    if exact:
        matches = exact
    else:
        # Partial match
        matches = []
        for key, entries in GP_PARTNER_INDEX.items():
            if name_lower in key:
                matches.extend(entries)

    if not matches:
        return {"error": f"No GP partner found matching '{name}'."}

    profiles = []
    for m in matches:
        missing = []
        if not m.get("email"):
            missing.append("email")
        if not m.get("linkedin"):
            missing.append("linkedin")
        if not m.get("facebook"):
            missing.append("facebook")

        profiles.append({
            **m,
            "contact_completeness": {
                "has_email": bool(m.get("email")),
                "has_linkedin": bool(m.get("linkedin")),
                "has_facebook": bool(m.get("facebook")),
                "has_website": bool(m.get("website")),
                "missing_fields": missing,
                "is_complete": len(missing) == 0,
            },
        })

    if len(profiles) == 1:
        return profiles[0]
    return {
        "total_matches": len(profiles),
        "note": "Multiple partners matched. Use a more specific name or filter by practice_id.",
        "partners": profiles,
    }


# ── Tool 11: Find partners with missing data ──────────────────────────────────
@mcp.tool()
def find_partners_with_missing_data(
    icb_name: str = "",
    pcn_name: str = "",
    practice_status: str = "all",
    limit: int = 30,
) -> dict:
    """
    Find GP partners who are missing contact information (email, LinkedIn, or
    both). Useful for identifying who needs to be researched and enriched.
    Can be scoped to a specific ICB, PCN, or lead status.

    Args:
        icb_name: Optional ICB name filter (partial match).
        pcn_name: Optional PCN name filter (partial match).
        practice_status: Filter by practice lead status.
                         Options: 'all', 'customer', 'warm_lead_pcn', 'cold_lead'.
        limit: Maximum results (default 30, max 200).

    Returns:
        Partners with missing data, grouped by what is missing.
    """
    limit = min(limit, 200)
    icb_lower = icb_name.lower().strip()
    pcn_lower = pcn_name.lower().strip()

    missing_linkedin = []
    missing_all = []

    for key, entries in GP_PARTNER_INDEX.items():
        for entry in entries:
            if icb_lower and icb_lower not in entry["practice_icb"].lower():
                continue
            if pcn_lower and pcn_lower not in entry["practice_pcn"].lower():
                continue
            if practice_status != "all" and entry["practice_status"] != practice_status:
                continue

            has_email = bool(entry.get("email"))
            has_linkedin = bool(entry.get("linkedin"))
            has_facebook = bool(entry.get("facebook"))

            if not has_email and not has_linkedin and not has_facebook:
                missing_all.append(entry)
            elif not has_linkedin:
                missing_linkedin.append(entry)

    missing_all.sort(key=lambda x: x["name"])
    missing_linkedin.sort(key=lambda x: x["name"])

    return {
        "summary": {
            "missing_all_contact": len(missing_all),
            "missing_linkedin_only": len(missing_linkedin),
            "total_needing_enrichment": len(missing_all) + len(missing_linkedin),
        },
        "missing_all_contact": missing_all[:limit // 2],
        "missing_linkedin": missing_linkedin[:limit // 2],
    }


# ── Tool 12: Enrich GP partner from web ──────────────────────────────────────
@mcp.tool()
def enrich_gp_partner_from_web(name: str, practice_name: str = "") -> dict:
    """
    Search the internet for a GP partner's LinkedIn profile and other public
    contact information. Uses web search to find their LinkedIn URL, NHS profile,
    practice website mentions, and any other publicly available contact details.

    This tool performs a live web search — results may take a few seconds.

    Args:
        name: Full name of the GP partner (e.g. 'Dr Sarah Jones').
        practice_name: Optional practice name to improve search accuracy.

    Returns:
        Enrichment results including found LinkedIn URL, NHS profile link,
        and other relevant web sources. Also shows what is already in the
        dashboard for this person.
    """
    name_stripped = name.strip()
    name_lower = name_stripped.lower()

    # Check what we already have in the dashboard
    existing = []
    for key, entries in GP_PARTNER_INDEX.items():
        if name_lower in key or key in name_lower:
            existing.extend(entries)

    # Build search queries
    base_query = f'{name_stripped} GP doctor UK'
    if practice_name:
        base_query = f'{name_stripped} GP "{practice_name}" UK'

    linkedin_query = f'{name_stripped} GP doctor LinkedIn UK site:linkedin.com'
    nhs_query = f'{name_stripped} GP NHS doctor UK'

    found_results = []
    linkedin_url = None
    nhs_profile = None
    other_links = []

    try:
        with DDGS() as ddgs:
            # Search 1: LinkedIn-specific
            li_results = list(ddgs.text(linkedin_query, max_results=5))
            for r in li_results:
                url = r.get("href", "")
                title = r.get("title", "")
                body = r.get("body", "")
                if "linkedin.com/in/" in url.lower():
                    if not linkedin_url:
                        linkedin_url = url
                    found_results.append({
                        "source": "LinkedIn",
                        "url": url,
                        "title": title,
                        "snippet": body[:200],
                    })

            time.sleep(0.5)  # polite delay

            # Search 2: General / NHS
            general_results = list(ddgs.text(nhs_query, max_results=8))
            for r in general_results:
                url = r.get("href", "")
                title = r.get("title", "")
                body = r.get("body", "")
                if "nhs.uk" in url.lower() or "nhsengland" in url.lower():
                    if not nhs_profile:
                        nhs_profile = url
                    found_results.append({
                        "source": "NHS",
                        "url": url,
                        "title": title,
                        "snippet": body[:200],
                    })
                elif url not in [r["url"] for r in found_results]:
                    other_links.append({
                        "source": "Web",
                        "url": url,
                        "title": title,
                        "snippet": body[:200],
                    })

    except Exception as e:
        return {
            "error": f"Web search failed: {str(e)}",
            "dashboard_data": existing,
        }

    # Deduplicate found_results
    seen_urls = set()
    deduped = []
    for r in found_results + other_links:
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            deduped.append(r)

    return {
        "searched_for": name_stripped,
        "practice_context": practice_name or "(not specified)",
        "dashboard_record": existing[0] if len(existing) == 1 else existing if existing else None,
        "already_in_dashboard": {
            "has_linkedin": any(e.get("linkedin") for e in existing),
            "has_email": any(e.get("email") for e in existing),
            "has_facebook": any(e.get("facebook") for e in existing),
        },
        "enrichment_found": {
            "linkedin_url": linkedin_url,
            "nhs_profile_url": nhs_profile,
            "total_sources_found": len(deduped),
        },
        "web_results": deduped[:10],
        "next_steps": (
            "LinkedIn URL found — add to dashboard and connect via LinkedIn."
            if linkedin_url else
            "No LinkedIn URL found automatically. Review the web results above "
            "and search manually on linkedin.com/search/results/people/ "
            f"using the query: '{name_stripped} GP UK'."
        ),
    }


# ---------------------------------------------------------------------------
# API Key authentication middleware
# ---------------------------------------------------------------------------
class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow health check without auth
        if request.url.path in ("/health", "/"):
            return await call_next(request)

        # Check Authorization header: Bearer <key>
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[len("Bearer "):]
            if token == API_KEY:
                return await call_next(request)

        # Also accept as query param ?api_key=<key> (for easy testing)
        query_key = request.query_params.get("api_key", "")
        if query_key == API_KEY:
            return await call_next(request)

        return JSONResponse(
            {"error": "Unauthorized. Provide a valid API key via 'Authorization: Bearer <key>' header."},
            status_code=401,
        )


# ---------------------------------------------------------------------------
# Build the final ASGI app: MCP backend + static frontend + health route
# ---------------------------------------------------------------------------
from starlette.routing import Route, Mount
from starlette.responses import JSONResponse as StarletteJSON, FileResponse
from starlette.staticfiles import StaticFiles
from starlette.applications import Starlette

FRONTEND_DIR = Path(os.getenv("FRONTEND_DIR", "./frontend"))

async def health(request: Request):
    return StarletteJSON({
        "status": "ok",
        "service": "GP Practice Explorer MCP",
        "practices_loaded": len(PRACTICES),
    })

async def serve_index(request: Request):
    """Serve the React SPA for all non-API, non-asset routes."""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return StarletteJSON({"error": "Frontend not found"}, status_code=404)

# Get the MCP ASGI app
mcp_app = mcp.streamable_http_app()

# Mount everything together:
# /health  -> health check (no auth)
# /mcp     -> MCP protocol (auth required via middleware)
# /assets  -> static JS/CSS (no auth)
# /        -> SPA frontend (no auth)
routes = [
    Route("/health", health, methods=["GET"]),
    Mount("/mcp", app=mcp_app),
]

if FRONTEND_DIR.exists():
    routes.append(Mount("/assets", app=StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets"))
    # Serve data files at root level for the SPA
    routes.append(Mount("/", app=StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend"))

base_app = Starlette(routes=routes)

# Apply API key middleware only to /mcp path
class MCPOnlyAPIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/mcp"):
            return await call_next(request)
        if not API_KEY:
            return await call_next(request)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer ") and auth_header[7:] == API_KEY:
            return await call_next(request)
        query_key = request.query_params.get("api_key", "")
        if query_key == API_KEY:
            return await call_next(request)
        return JSONResponse(
            {"error": "Unauthorized. Provide a valid API key via 'Authorization: Bearer <key>' header."},
            status_code=401,
        )

base_app.add_middleware(MCPOnlyAPIKeyMiddleware)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(base_app, host="0.0.0.0", port=port)
