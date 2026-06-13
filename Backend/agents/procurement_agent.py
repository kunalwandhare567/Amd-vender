"""
VendorVerse 3.0 – Procurement Agent
Specialist agent for supplier swap, alternative supplier discovery, and RFQ recommendations.
Produces structured procurement findings for the Supervisor to consume.
"""
import json
from langchain_core.messages import AIMessage

try:
    from agents.state import AgentState
    from agents.tools import (
        get_all_suppliers, get_supplier_by_id, get_open_rfqs,
        format_supplier_brief, format_suppliers_context,
        find_alternative_suppliers
    )
except ImportError:
    from state import AgentState
    from tools import (
        get_all_suppliers, get_supplier_by_id, get_open_rfqs,
        format_supplier_brief, format_suppliers_context,
        find_alternative_suppliers
    )

from llm import get_llm


PROCUREMENT_AGENT_SYSTEM = """You are the VendorVerse Procurement Intelligence Agent.
Your role is to optimize procurement decisions and supplier sourcing.

You specialize in:
- Discovering and ranking alternative suppliers for a given product type or SKU
- Running Supplier Swap analysis (cost, lead time, risk comparison)
- Generating RFQ recommendations with target price and terms
- Identifying procurement risks and cost optimization opportunities
- Ranking suppliers by composite score (risk, cost, lead time, OTD)

Always base your analysis on the ACTUAL data provided. Be specific and data-driven.
Return structured JSON output only."""


def procurement_agent_node(state: AgentState) -> dict:
    """
    Procurement Agent: finds alternative suppliers, runs swap analysis, generates RFQ recommendations.
    Called by the Supervisor when procurement decisions are needed.
    """
    print("--- [PROCUREMENT AGENT] Analyzing procurement options ---")

    target_supplier_id = state.get("supplier_id")
    all_suppliers = get_all_suppliers()
    open_rfqs = get_open_rfqs()

    # If a specific supplier is targeted, focus on finding alternatives
    target_supplier = None
    alternatives_context = ""
    target_context = ""

    if target_supplier_id:
        target_supplier = get_supplier_by_id(target_supplier_id)
        if target_supplier:
            alternatives = find_alternative_suppliers(
                product_types=target_supplier.product_types,
                exclude_supplier_id=target_supplier_id
            )
            target_context = f"TARGET SUPPLIER:\n{format_supplier_brief(target_supplier)}"
            alternatives_context = f"ALTERNATIVE SUPPLIERS (sorted by score):\n{format_suppliers_context(alternatives)}"
        else:
            target_context = f"Note: Supplier {target_supplier_id} not found in database."
            alternatives_context = ""
    else:
        # General procurement overview — top and bottom performers
        sorted_suppliers = sorted(
            all_suppliers,
            key=lambda s: -(s.overall_score or 0)
        )
        top5 = sorted_suppliers[:5]
        bottom5 = sorted_suppliers[-5:]
        alternatives_context = (
            f"TOP PERFORMING SUPPLIERS:\n{format_suppliers_context(top5)}\n\n"
            f"LOWEST PERFORMING SUPPLIERS:\n{format_suppliers_context(bottom5)}"
        )

    # Format open RFQs
    rfq_context = "No open RFQs." if not open_rfqs else "\n".join(
        f"RFQ {r.id}: supplier={r.supplier_id}, SKU={r.part_sku}, qty={r.quantity}, "
        f"delivery={r.target_delivery_days}d, status={r.status}"
        for r in open_rfqs
    )

    last_message = ""
    for msg in reversed(state.get("messages", [])):
        if hasattr(msg, "content") and isinstance(msg.content, str):
            last_message = msg.content
            break

    prompt = f"""{PROCUREMENT_AGENT_SYSTEM}

TASK: {state.get('task', last_message)}

{target_context}

{alternatives_context}

OPEN RFQs:
{rfq_context}

Analyse the procurement situation and return a JSON object with:
{{
  "agent": "procurement",
  "task_type": "supplier_swap|rfq_recommendation|general_analysis",
  "recommended_suppliers": [
    {{
      "rank": 1,
      "supplier_id": "...",
      "supplier_name": "...",
      "overall_score": <0-100>,
      "risk_level": "...",
      "cost_index": "Lower|Similar|Higher",
      "lead_time_days": <number>,
      "otd_percentage": <number>,
      "defect_rate": <number>,
      "key_advantages": ["adv1", "adv2"],
      "key_risks": ["risk1"],
      "swap_recommendation": "Strongly Recommended|Recommended|Consider|Avoid"
    }}
  ],
  "rfq_recommendation": {{
    "suggested_supplier_id": "...",
    "suggested_supplier_name": "...",
    "target_price_range": "...",
    "suggested_delivery_days": <number>,
    "terms": "...",
    "justification": "..."
  }},
  "cost_impact": {{
    "estimated_savings_pct": <number>,
    "risk_reduction_pct": <number>,
    "lead_time_change_days": <number>
  }},
  "procurement_risks": ["risk1", "risk2"],
  "immediate_actions": ["action1", "action2"],
  "procurement_summary": "2-3 sentence executive procurement summary"
}}

Output ONLY valid JSON, no markdown."""

    llm = get_llm(temperature=0.4)
    response = llm.invoke([AIMessage(content=prompt)])

    try:
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        findings = json.loads(content)
    except Exception as e:
        print(f"[PROCUREMENT AGENT] JSON parse error: {e}")
        findings = {
            "agent": "procurement",
            "task_type": "general_analysis",
            "procurement_summary": f"Procurement analysis failed: {str(e)}",
            "error": str(e)
        }

    rec_count = len(findings.get("recommended_suppliers", []))
    print(f"[PROCUREMENT AGENT] Found {rec_count} supplier recommendations.")

    return {
        "procurement_findings": findings,
        "messages": [AIMessage(content=f"[Procurement Agent] Analysis complete. Found {rec_count} alternative supplier(s).")]
    }
