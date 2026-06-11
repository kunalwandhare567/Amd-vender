from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage
from agents.graph import graph

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    image: Optional[str] = None # Base64 encoded image
    thread_id: Optional[str] = None

@router.post("/", response_model=dict)
async def chat(request: ChatRequest):
    try:
        content = [{"type": "text", "text": request.message}]
        if request.image:
            # Provide the image as base64 data URI
            content.append({
                "type": "image_url", 
                "image_url": {"url": request.image}
            })
            
        inputs = {"messages": [HumanMessage(content=content)]}
        result = await graph.ainvoke(inputs)
        
        response_message = result["messages"][-1].content
        return {"response": response_message}
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
