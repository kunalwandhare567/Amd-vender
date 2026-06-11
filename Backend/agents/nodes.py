import os
from dotenv import load_dotenv
from llm import get_llm as get_central_llm
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from sqlmodel import Session, select
try:
    from agents.state import AgentState
except ImportError:
    from state import AgentState
from database import engine
from models import Supplier, Alert


# Load environment variables
load_dotenv(override=True)

# Lazy LLM initialization (avoids stale env vars on hot-reload)
_llm = None

def get_llm():
    global _llm
    _llm = get_central_llm(temperature=0.7)
    return _llm


def get_live_context():
    """Fetch live supplier and alert data from the database."""
    try:
        with Session(engine) as session:
            suppliers = session.exec(select(Supplier)).all()
            alerts = session.exec(select(Alert)).all()

        supplier_lines = []
        for s in suppliers:
            supplier_lines.append(
                f"- {s.name} (ID: {s.supplier_id}): score={s.overall_score or 'N/A'}, "
                f"risk={s.risk_level or 'N/A'}, OTD={s.otd_percentage or 'N/A'}%, "
                f"defect_rate={s.defect_rate}%, inspection_pass={s.inspection_pass_rate}%, "
                f"lead_time={s.avg_lead_time}d, ship_time={s.avg_shipping_time}d, "
                f"mfg_lead_time={s.avg_manufacturing_lead_time}d, "
                f"revenue=${s.total_revenue:,.0f}, location={s.location}, "
                f"transport={s.transportation_modes}, carriers={s.shipping_carriers}"
            )

        alert_lines = []
        for a in alerts:
            alert_lines.append(
                f"- [{a.severity}] {a.supplier_name}: {a.message} (status: {a.status})"
            )

        context = "SUPPLIERS:\n" + "\n".join(supplier_lines)
        if alert_lines:
            context += "\n\nALERTS:\n" + "\n".join(alert_lines)
        else:
            context += "\n\nALERTS: No active alerts."

        return context
    except Exception as e:
        print(f"Error fetching live context: {e}")
        return "No supplier data available at this time."


def retrieve_node(state: AgentState):
    """Retrieves relevant context — uses live DB data (always available)."""
    print("---RETRIEVING CONTEXT---")

    # Try RAG retrieval first, fall back to live DB data
    rag_context = ""
    try:
        from rag.store import get_retriever
        last_message = state["messages"][-1]
        query = ""
        if isinstance(last_message.content, list):
            for item in last_message.content:
                if item["type"] == "text":
                    query += item["text"]
        else:
            query = last_message.content

        retriever = get_retriever()
        docs = retriever.invoke(query)
        rag_context = "\n\n".join([doc.page_content for doc in docs])
    except Exception as e:
        print(f"RAG retrieval failed (using live DB instead): {e}")

    # Always include live database context
    live_context = get_live_context()

    if rag_context:
        context = f"RAG SEARCH RESULTS:\n{rag_context}\n\nLIVE DATABASE:\n{live_context}"
    else:
        context = live_context

    return {"context": context}


def generate_node(state: AgentState):
    """Generates an answer using the retrieved context."""
    print("---GENERATING ANSWER---")

    context = state.get("context", "")

    system_message = f"""You are the Supplier Sentinel AI Assistant, an expert supply chain analyst powered by Azure OpenAI.
You have access to real-time supplier data and can answer questions about:
- Supplier performance, risks, scores, and metrics
- Active alerts and their severity
- Delivery rates (OTD), defect rates, inspection pass rates
- Supplier locations and product types
- Lead times, shipping costs, manufacturing costs, and revenue
- Recommendations for supplier management

Use the data below to give specific, data-driven answers. Be concise but thorough.
If asked about something not in the data, say so honestly and offer related insights.

AVAILABLE DATA:
{context}"""

    final_messages = [SystemMessage(content=system_message)]
    final_messages.extend(state["messages"])

    response = get_llm().invoke(final_messages)

    return {"messages": [response]}
