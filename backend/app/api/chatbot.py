from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.core.dependencies import get_current_user
from app.schemas.schemas import ChatbotQueryRequest, ChatbotQueryResponse
from app.services import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["DOA Governance Assistant Bot"])

@router.post("/query", response_model=ChatbotQueryResponse)
def query_assistant(
    payload: ChatbotQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Query the DOA Governance Assistant with strict guardrails, published matrix retrieval,
    and contextual advice (GPT-powered with resilient fallback).
    """
    return chatbot_service.query_chatbot(db=db, request=payload, current_user=current_user)
