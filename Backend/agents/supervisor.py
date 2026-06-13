"""
VendorVerse 3.0 – Supervisor Agent (Orchestrator)
Routes tasks to specialist agents and synthesizes findings into executive decisions.

Flow:
  User Query → Supervisor (routing) → Risk Agent / Procurement Agent / Both
            → Supervisor (synthesis) → Executive Summary → Response
"""
import json
from langchain_core.messages import AIMessage, SystemMessage

try:
    from agents.state import AgentState
except ImportError:
    from state import AgentState

from llm import get_llm


SUPERVISOR_SYSTEM = """You are the VendorVerse Executive AI Supervisor.
You orchestrate a team of specialist agents and synthesize their findings into actionable executive intelligence.

Your specialist agents:
1. risk - Monitors supplier risk levels, SLA breaches, active alerts
2. procurement - Finds alternative suppliers, runs swap analysis, generates RFQ recommendations
3. FINISH - Task is complete, synthesize final executive response

Your routing rules:
- Questions about supplier risk, alerts, SLA breaches → route to "risk"
- Questions about finding alternatives, supplier swap, RFQ → route to "procurement"
- Questions requiring both risk AND procurement insight → route to "risk" first
- If risk findings are already available and procurement is needed → route to "procurement"
- If all needed findings are collected → route to "FINISH"

Always route to exactly ONE agent, or FINISH."""


def supervisor_node(state: AgentState) -> dict:
    """
    Supervisor: decides which agent to run next based on task and current findings.
    """
    print("--- [SUPERVISOR] Routing task ---")

    task = state.get("task", "")
    risk_done = state.get("risk_findings") is not None
    procurement_done = state.get("procurement_findings") is not None

    # Get last user message
    last_message = ""
    for msg in reversed(state.get("messages", [])):
        if hasattr(msg, "content") and isinstance(msg.content, str):
            last_message = msg.content
            break

    routing_prompt = f"""{SUPERVISOR_SYSTEM}

CURRENT TASK: {task or last_message}

COMPLETED AGENTS:
- Risk Agent: {"Done" if risk_done else "Not run"}
- Procurement Agent: {"Done" if procurement_done else "Not run"}

Based on the task and which agents have already run, decide the NEXT step.
Return ONLY a JSON object:
{{"next": "risk" | "procurement" | "FINISH", "reason": "brief reason"}}

Output ONLY valid JSON."""

    llm = get_llm(temperature=0.1)
    response = llm.invoke([AIMessage(content=routing_prompt)])

    try:
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        routing = json.loads(content)
        next_agent = routing.get("next", "FINISH")
        reason = routing.get("reason", "")
    except Exception as e:
        print(f"[SUPERVISOR] Routing parse error: {e}. Defaulting to FINISH.")
        next_agent = "FINISH"
        reason = "Routing error — defaulting to synthesis"

    print(f"[SUPERVISOR] Routing to: {next_agent} | Reason: {reason}")

    return {
        "next_agent": next_agent,
        "messages": [AIMessage(content=f"[Supervisor] Routing to {next_agent}. {reason}")]
    }


def executive_synthesis_node(state: AgentState) -> dict:
    """
    Executive Agent: synthesizes all agent findings into a final executive response.
    This is the FINISH node — called when all needed agents have run.
    """
    print("--- [EXECUTIVE AGENT] Synthesizing final response ---")

    risk_findings = state.get("risk_findings", {})
    procurement_findings = state.get("procurement_findings", {})

    task = state.get("task", "")
    last_message = ""
    for msg in reversed(state.get("messages", [])):
        if hasattr(msg, "content") and isinstance(msg.content, str) and "[" not in msg.content[:5]:
            last_message = msg.content
            break

    # Build synthesis prompt from available findings
    findings_sections = []
    if risk_findings:
        findings_sections.append(
            f"RISK AGENT FINDINGS:\n{json.dumps(risk_findings, indent=2)}"
        )
    if procurement_findings:
        findings_sections.append(
            f"PROCUREMENT AGENT FINDINGS:\n{json.dumps(procurement_findings, indent=2)}"
        )

    findings_text = "\n\n".join(findings_sections) if findings_sections else "No specialist findings available."

    synthesis_prompt = f"""You are the VendorVerse Executive AI. Synthesize the specialist agent findings into a clear, actionable executive response.

ORIGINAL QUESTION: {task or last_message}

SPECIALIST AGENT FINDINGS:
{findings_text}

Create a comprehensive executive response that:
1. Directly answers the original question
2. Highlights the most critical insights from each agent
3. Provides 3-5 specific, prioritized action items
4. Includes a confidence level for the recommendations
5. Uses clear business language (not technical jargon)

Structure your response naturally as an executive briefing. Be concise but comprehensive."""

    llm = get_llm(temperature=0.5)
    response = llm.invoke([AIMessage(content=synthesis_prompt)])
    executive_response = response.content.strip()

    print("[EXECUTIVE AGENT] Synthesis complete.")

    return {
        "executive_summary": executive_response,
        "messages": [AIMessage(content=executive_response)]
    }


def route_after_supervisor(state: AgentState) -> str:
    """LangGraph conditional edge — maps supervisor output to next node."""
    return state.get("next_agent", "FINISH")
