"""
VendorVerse 3.0 – Multi-Agent Shared State
Defines the state schema passed between all agents in the LangGraph graph.
"""
from typing import List, Optional, Dict, Any, Annotated
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    """Shared state flowing through the multi-agent graph."""
    # Conversation messages (accumulated across all agents)
    messages: Annotated[List[BaseMessage], operator.add]

    # Fetched context from pgvector / DB
    context: str

    # Supervisor routing
    next_agent: str           # which agent to run next ("risk", "procurement", "route", "FINISH")
    task: str                 # human-readable task description for routing

    # Individual agent findings (populated as each agent runs)
    risk_findings: Optional[Dict[str, Any]]
    procurement_findings: Optional[Dict[str, Any]]
    route_findings: Optional[Dict[str, Any]]

    # Final synthesized output from Executive Agent
    executive_summary: Optional[str]

    # Metadata
    supplier_id: Optional[str]    # target supplier (if task is supplier-specific)
    rfq_id: Optional[str]         # target RFQ (if task is RFQ-specific)
    session_id: Optional[str]     # for memory persistence
