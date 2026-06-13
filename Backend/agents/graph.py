"""
VendorVerse 3.0 – Multi-Agent LangGraph
Implements the Supervisor → Specialist Agents → Executive Synthesis pattern.

Graph topology:
  START → supervisor → [risk | procurement | FINISH]
                risk → supervisor  (loop back for more routing)
         procurement → supervisor  (loop back for more routing)
              FINISH → executive_synthesis → END
"""
from langgraph.graph import StateGraph, START, END

try:
    from agents.state import AgentState
    from agents.nodes import retrieve_node, generate_node          # legacy RAG chat nodes
    from agents.risk_agent import risk_agent_node
    from agents.procurement_agent import procurement_agent_node
    from agents.supervisor import supervisor_node, executive_synthesis_node, route_after_supervisor
except ImportError:
    from state import AgentState
    from nodes import retrieve_node, generate_node
    from risk_agent import risk_agent_node
    from procurement_agent import procurement_agent_node
    from supervisor import supervisor_node, executive_synthesis_node, route_after_supervisor


# ── Legacy Single-Agent RAG Graph (used by /api/chat) ──────────────────────────
rag_builder = StateGraph(AgentState)
rag_builder.add_node("retrieve", retrieve_node)
rag_builder.add_node("generate", generate_node)
rag_builder.add_edge(START, "retrieve")
rag_builder.add_edge("retrieve", "generate")
rag_builder.add_edge("generate", END)
graph = rag_builder.compile()   # legacy export used by chat router


# ── Multi-Agent Supervisor Graph (used by /api/agents/run) ──────────────────────
multi_builder = StateGraph(AgentState)

# Add all nodes
multi_builder.add_node("supervisor", supervisor_node)
multi_builder.add_node("risk", risk_agent_node)
multi_builder.add_node("procurement", procurement_agent_node)
multi_builder.add_node("executive_synthesis", executive_synthesis_node)

# Entry point → Supervisor
multi_builder.add_edge(START, "supervisor")

# Supervisor routes dynamically
multi_builder.add_conditional_edges(
    "supervisor",
    route_after_supervisor,
    {
        "risk": "risk",
        "procurement": "procurement",
        "FINISH": "executive_synthesis"
    }
)

# After each specialist agent → loop back to Supervisor for re-routing
multi_builder.add_edge("risk", "supervisor")
multi_builder.add_edge("procurement", "supervisor")

# Executive synthesis is the terminal node
multi_builder.add_edge("executive_synthesis", END)

multi_agent_graph = multi_builder.compile()
