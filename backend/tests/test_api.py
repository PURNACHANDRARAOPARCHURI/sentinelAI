import pytest
from fastapi.testclient import TestClient
from backend.app.main import app, init_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_system_health_endpoint(client):
    response = client.get("/api/v1/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["xgboost_model_loaded"] is True
    assert data["isolation_forest_loaded"] is True

def test_auth_login(client):
    response = client.post("/api/v1/auth/login", json={
        "username": "analyst",
        "password": "AnalystPassword123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "analyst"

def test_analyze_low_risk_transaction(client):
    tx_payload = {
        "amount": 45.0,
        "tx_type": "PAYMENT",
        "sender_account": "C123456789",
        "receiver_account": "M987654321",
        "step": 12,
        "oldbalance_org": 5000.0,
        "newbalance_orig": 4955.0,
        "oldbalance_dest": 1000.0,
        "newbalance_dest": 1045.0,
        "description": "Lunch with colleagues"
    }
    response = client.post("/api/v1/transactions/analyze", json=tx_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "APPROVE"
    assert data["status"] == "APPROVED"
    assert data["escalated_to_agents"] is False
    assert data["final_risk_score"] < 0.30

def test_analyze_high_risk_fraud_transaction(client):
    tx_payload = {
        "amount": 920000.0,
        "tx_type": "TRANSFER",
        "sender_account": "C888999111",
        "receiver_account": "C222333444",
        "step": 3,
        "oldbalance_org": 920000.0,
        "newbalance_orig": 0.0,
        "oldbalance_dest": 0.0,
        "newbalance_dest": 0.0,
        "description": "Urgent crypto p2p withdrawal immediate"
    }
    response = client.post("/api/v1/transactions/analyze", json=tx_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["escalated_to_agents"] is True
    assert data["final_risk_score"] >= 0.70
    assert data["decision"] == "HUMAN_REVIEW"
    assert data["status"] == "IN_REVIEW"
    assert data["investigation"] is not None
    assert data["investigation"]["behavioral_score"] > 0.50
    assert data["investigation"]["rag_score"] > 0.50
    assert data["investigation"]["guardrail_status"] == "PASSED"

def test_dashboard_summary(client):
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_transactions"] >= 3
    assert "fraud_detection_rate" in data

def test_model_performance_endpoint(client):
    response = client.get("/api/v1/models/performance")
    assert response.status_code == 200
    data = response.json()
    assert "xgboost" in data
    assert "isolation_forest" in data
    assert data["xgboost"]["accuracy"] >= 0.80
    assert data["isolation_forest"]["accuracy"] >= 0.80
