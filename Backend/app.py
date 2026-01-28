from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
import os
import uvicorn

from utils.cosmos_connection import (
    cosmos_enabled,
    save_message_to_cosmos,
    update_feedback,
    get_sessions_for_sidebar,
    get_messages_for_session,
    create_session_doc,
    delete_session_messages,
    delete_session_doc,
    update_session_on_message,   # ✅ FIX: missing import
)

from utils.llm_invoke import call_llm_async_with_retry, warm_up_search_index
from utils.log_utils import logger

load_dotenv()

# ==========================
# App setup
# ==========================

allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins_list = [o.strip() for o in allowed_origins.split(",") if o.strip()]

app = FastAPI(
    title="AZURE AI CHATBOT API",
    version="0.0.1",
    description="API for Azure AI Chatbot with Cosmos DB integration",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ==========================
# Pydantic Models
# ==========================

class FeedbackModel(BaseModel):
    message_id: str = Field(..., alias="id")
    session_id: str = Field(..., alias="sessionId")
    user_id: str = Field(..., alias="userId")
    feedback: Literal["positive", "negative"]

    class Config:
        populate_by_name = True


class SessionModel(BaseModel):
    session_id: str


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: datetime
    thumbs_up: bool = False
    thumbs_down: bool = False
    feedback_updated_at: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str
    session_id: str
    user_id: str
    user_roles: List[str] = Field(default_factory=list)


class Source(BaseModel):
    title: str
    url: str


class ChatResponse(BaseModel):
    response: str
    session_id: str
    message_id: str
    sources: List[Source] = Field(default_factory=list)


class SessionInfo(BaseModel):
    session_id: str
    cosmos_enabled: bool
    message_count: int


class MessageHistory(BaseModel):
    messages: List[ChatMessage]
    session_id: str


# ==========================
# Routes
# ==========================

@app.get("/")
async def root():
    try:
        success = await warm_up_search_index()
        return {
            "status": "healthy",
            "cosmos_enabled": cosmos_enabled,
            "success": success,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Warmup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/session/new")
async def create_new_session(user_id: str):   # ✅ FIX
    session_id = str(uuid.uuid4())
    create_session_doc(user_id, session_id)
    return {"session_id": session_id}


@app.get("/sessions")
async def get_sessions(user_id: str, limit: int = 10):
    try:
        return {"sessions": get_sessions_for_sidebar(user_id, limit) or []}
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/session/messages")
async def get_session_messages(user_id: str, session_id: str):
    try:
        messages = get_messages_for_session(user_id, session_id)
        if messages is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"session_id": session_id, "messages": messages}
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/update-feedback")
async def feedback_endpoint(feedback: FeedbackModel):
    thumbs_up = feedback.feedback == "positive"
    thumbs_down = feedback.feedback == "negative"

    try:
        updated = update_feedback(
            message_id=feedback.message_id,
            session_id=feedback.session_id,
            user_id=feedback.user_id,
            thumbs_up=thumbs_up,
            thumbs_down=thumbs_down,
        )

        return {
            "status": "success",
            "updated_message": {
                "id": updated["id"],
                "thumbs_up": updated["thumbs_up"],
                "thumbs_down": updated["thumbs_down"],
            },
        }

    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # USER message
        save_message_to_cosmos(
            user_id=request.user_id,
            session_id=request.session_id,
            role="user",
            content=request.message,
            user_roles=request.user_roles,
        )

        update_session_on_message(
            user_id=request.user_id,
            session_id=request.session_id,
            content=request.message,
        )

        # LLM
        response, sources = await call_llm_async_with_retry(
            request.user_id,
            request.message,
            request.session_id,
        )

        # ASSISTANT message
        message_id = save_message_to_cosmos(
            user_id=request.user_id,
            session_id=request.session_id,
            role="assistant",
            content=response,
            sources=sources,
            user_roles=request.user_roles,
        )

        return ChatResponse(
            response=response,
            session_id=request.session_id,
            message_id=message_id,
            sources=sources,
        )

    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/session")
async def delete_session(user_id: str, session_id: str):
    try:
        delete_session_messages(user_id, session_id)
        delete_session_doc(user_id, session_id)
        return {"status": "success", "session_id": session_id}
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
