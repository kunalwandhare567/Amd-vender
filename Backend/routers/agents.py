"""
VendorVerse 3.0 – Multi-Agent API Router
Exposes the multi-agent LangGraph system via REST endpoints.

Endpoints:
  POST /api/agents/run        — Run the full multi-agent pipeline on a query
  POST /api/agents/risk       — Run only the Risk Agent
  POST /api/agents/procurement — Run only the Procurement Agent
  GET  /api/agents/status     — Health check for the agent system
"""
import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from routers.auth import get_current_user
from models import User

router = APIRouter(prefix="/api/agents", tags=["Multi-Agent System"])


class AgentRunRequest(BaseModel):
    query: str
    supplier_id: Optional[str] = None
    rfq_id: Optional[str] = None
    task_hint: Optional[str] = None   # "risk" | "procurement" | "auto"


class AgentRunResponse(BaseModel):
    session_id: str
    query: str
    executive_summary: str
    risk_findings: Optional[dict] = None
    procurement_findings: Optional[dict] = None
    agent_trace: list  # messages from each agent
    agents_invoked: list


@router.post("/run", response_model=AgentRunResponse)
async def run_multi_agent(
    request: AgentRunRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Run the full multi-agent pipeline.
    The Supervisor automatically routes to Risk, Procurement, or both agents based on the query.
    Returns structured findings + executive synthesis.
    """
    try:
        from agents.graph import multi_agent_graph
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent system initialization failed: {str(e)}")

    session_id = str(uuid.uuid4())[:8]
    task_description = request.query

    initial_state = {
        "messages": [HumanMessage(content=request.query)],
        "context": "",
        "task": task_description,
        "next_agent": "",
        "risk_findings": None,
        "procurement_findings": None,
        "route_findings": None,
        "executive_summary": None,
        "supplier_id": request.supplier_id,
        "rfq_id": request.rfq_id,
        "session_id": session_id
    }

    try:
        final_state = multi_agent_graph.invoke(
            initial_state,
            config={"recursion_limit": 10}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")

    # Extract agent trace from messages
    agent_trace = []
    agents_invoked = []
    for msg in final_state.get("messages", []):
        content = msg.content if hasattr(msg, "content") else str(msg)
        if isinstance(content, str):
            agent_trace.append(content)
            if "[Risk Agent]" in content and "risk" not in agents_invoked:
                agents_invoked.append("risk")
            elif "[Procurement Agent]" in content and "procurement" not in agents_invoked:
                agents_invoked.append("procurement")
            elif "[Supervisor]" in content and "supervisor" not in agents_invoked:
                agents_invoked.append("supervisor")

    if "executive_synthesis" not in agents_invoked:
        agents_invoked.append("executive_synthesis")

    return AgentRunResponse(
        session_id=session_id,
        query=request.query,
        executive_summary=final_state.get("executive_summary", "No summary generated."),
        risk_findings=final_state.get("risk_findings"),
        procurement_findings=final_state.get("procurement_findings"),
        agent_trace=agent_trace,
        agents_invoked=agents_invoked
    )


@router.post("/risk")
async def run_risk_agent(
    request: AgentRunRequest,
    current_user: User = Depends(get_current_user)
):
    """Run only the Risk Agent for targeted risk analysis."""
    try:
        from agents.risk_agent import risk_agent_node
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk Agent initialization failed: {str(e)}")

    state = {
        "messages": [HumanMessage(content=request.query)],
        "context": "",
        "task": request.query,
        "next_agent": "",
        "risk_findings": None,
        "procurement_findings": None,
        "route_findings": None,
        "executive_summary": None,
        "supplier_id": request.supplier_id,
        "rfq_id": request.rfq_id,
        "session_id": str(uuid.uuid4())[:8]
    }

    try:
        result = risk_agent_node(state)
        return {
            "agent": "risk",
            "supplier_id": request.supplier_id,
            "findings": result.get("risk_findings", {}),
            "message": result.get("messages", [{}])[-1].content if result.get("messages") else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk Agent execution failed: {str(e)}")


@router.post("/procurement")
async def run_procurement_agent(
    request: AgentRunRequest,
    current_user: User = Depends(get_current_user)
):
    """Run only the Procurement Agent for targeted supplier swap / RFQ analysis."""
    try:
        from agents.procurement_agent import procurement_agent_node
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Procurement Agent initialization failed: {str(e)}")

    state = {
        "messages": [HumanMessage(content=request.query)],
        "context": "",
        "task": request.query,
        "next_agent": "",
        "risk_findings": None,
        "procurement_findings": None,
        "route_findings": None,
        "executive_summary": None,
        "supplier_id": request.supplier_id,
        "rfq_id": request.rfq_id,
        "session_id": str(uuid.uuid4())[:8]
    }

    try:
        result = procurement_agent_node(state)
        return {
            "agent": "procurement",
            "supplier_id": request.supplier_id,
            "findings": result.get("procurement_findings", {}),
            "message": result.get("messages", [{}])[-1].content if result.get("messages") else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Procurement Agent execution failed: {str(e)}")


@router.get("/status")
def agent_system_status():
    """Health check — verifies all agents can be imported."""
    status = {"system": "VendorVerse Multi-Agent System", "agents": {}}

    agents_to_check = {
        "supervisor": "agents.supervisor",
        "risk": "agents.risk_agent",
        "procurement": "agents.procurement_agent",
        "graph": "agents.graph"
    }

    for name, module_path in agents_to_check.items():
        try:
            __import__(module_path)
            status["agents"][name] = "ready"
        except Exception as e:
            status["agents"][name] = f"error: {str(e)}"

    all_ready = all(v == "ready" for v in status["agents"].values())
    status["status"] = "healthy" if all_ready else "degraded"
    return status
