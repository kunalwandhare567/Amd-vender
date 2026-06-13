"""
VendorVerse 3.0 – Risk Agent
Specialist agent that monitors supplier risks, SLA breaches, and active alerts.
Produces structured risk findings for the Supervisor to consume.
"""
import json
from langchain_core.messages import AIMessage, SystemMessage

try:
    from agents.state import AgentState
    from agents.tools import (
        get_all_suppliers, get_active_alerts, get_sla_metrics,
        format_suppliers_context, format_alerts_context, format_sla_context
    )
except ImportError:
    from state import AgentState
    from tools import (
        get_all_suppliers, get_active_alerts, get_sla_metrics,
        format_suppliers_context, format_alerts_context, format_sla_context
    )

from llm import get_llm


RISK_AGENT_SYSTEM = """You are the VendorVerse Risk Intelligence Agent.
Your role is to continuously monitor supplier risks and identify emerging threats.

You specialize in:
- Identifying High and Critical risk suppliers from live data
- Analysing SLA breach patterns and their downstream impact
- Correlating active alerts with supplier performance metrics
- Predicting risk trajectories based on current indicators
- Recommending immediate risk mitigation actions

Always base your analysis on the ACTUAL data provided. Be specific with supplier names, IDs, and metrics.
Return structured JSON output only."""


def risk_agent_node(state: AgentState) -> dict:
    """
    Risk Agent: analyses all supplier risk signals and returns structured findings.
    Called by the Supervisor when risk intelligence is needed.
    """
    print("--- [RISK AGENT] Analyzing supplier risks ---")

    # Fetch live data
    suppliers = get_all_suppliers()
    alerts = get_active_alerts(supplier_id=state.get("supplier_id"))
    sla_metrics = get_sla_metrics(supplier_id=state.get("supplier_id"))

    supplier_context = format_suppliers_context(suppliers)
    alert_context = format_alerts_context(alerts)
    sla_context = format_sla_context(sla_metrics)

    # Get last user message for task context
    last_message = ""
    for msg in reversed(state.get("messages", [])):
        if hasattr(msg, "content") and isinstance(msg.content, str):
            last_message = msg.content
            break

    prompt = f"""{RISK_AGENT_SYSTEM}

TASK: {state.get('task', last_message)}

LIVE SUPPLIER DATA:
{supplier_context}

ACTIVE ALERTS:
{alert_context}

SLA METRICS:
{sla_context}

Analyse ALL the data above and return a JSON object with:
{{
  "agent": "risk",
  "overall_risk_level": "Low|Medium|High|Critical",
  "portfolio_risk_score": <0-100>,
  "critical_suppliers": [
    {{"supplier_id": "...", "supplier_name": "...", "risk_level": "...", "risk_score": <0-100>,
      "key_risks": ["risk1", "risk2"], "sla_breaches": <count>, "active_alerts": <count>,
      "recommended_action": "..."}}
  ],
  "top_alerts": [
    {{"severity": "...", "supplier_name": "...", "message": "...", "impact": "..."}}
  ],
  "sla_breach_summary": {{
    "total_breached": <count>, "total_warning": <count>,
    "most_at_risk_supplier": "...", "breach_details": ["..."]
  }},
  "risk_trends": ["trend1", "trend2", "trend3"],
  "immediate_actions": ["action1", "action2", "action3"],
  "risk_summary": "2-3 sentence executive risk summary"
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
        print(f"[RISK AGENT] JSON parse error: {e}")
        findings = {
            "agent": "risk",
            "overall_risk_level": "Unknown",
            "portfolio_risk_score": 0,
            "risk_summary": f"Risk analysis failed: {str(e)}",
            "error": str(e)
        }

    print(f"[RISK AGENT] Risk level: {findings.get('overall_risk_level', 'N/A')}")

    return {
        "risk_findings": findings,
        "messages": [AIMessage(content=f"[Risk Agent] Analysis complete. Portfolio risk: {findings.get('overall_risk_level', 'N/A')} ({findings.get('portfolio_risk_score', 0)}/100)")]
    }
