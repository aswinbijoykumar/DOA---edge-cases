import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chatbot_guardrail_rejection_for_action(client, user_token):
    # Prohibited action: execute approve/reject/modify
    payload = {"message": "Please approve my change request #24 immediately"}
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.post("/api/chatbot/query", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_guardrail_triggered"] is True
    assert "read-only governance assistant" in data["response"]

def test_chatbot_guardrail_rejection_for_invoices(client, user_token):
    # Prohibited action: check live operational transactions/invoices
    payload = {"message": "Can you check invoice #9923 status and payment disbursement?"}
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.post("/api/chatbot/query", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_guardrail_triggered"] is True
    assert "outside the scope" in data["response"]

def test_chatbot_authorized_threshold_inquiry(client, user_token):
    # Authorized capability: threshold lookup
    payload = {"message": "What is the authority limit for Finance procurement or CapEx?"}
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.post("/api/chatbot/query", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_guardrail_triggered"] is False
    assert len(data["response"]) > 0

def test_chatbot_authorized_checklist_inquiry(client, user_token):
    # Authorized capability: checklist guidance
    payload = {"message": "What is the mandatory checklist before submitting a proposal?"}
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.post("/api/chatbot/query", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_guardrail_triggered"] is False
    assert "Checklist" in data["response"] or "Mandatory" in data["response"]
