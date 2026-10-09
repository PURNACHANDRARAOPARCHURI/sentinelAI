from backend.app.ml.feature_engineering import feature_engineer
from backend.app.ml.xgboost_model import xgb_predictor
from backend.app.ml.isolation_forest_model import iso_forest_predictor
from backend.app.ml.initial_aggregator import initial_risk_aggregator
from backend.app.agents.orchestrator import orchestrator
from backend.app.decision.engine import decision_engine

amounts = [10000, 50000, 200000, 500000, 1000000, 5000000, 10000000, 50000000]

for amt in amounts:
    tx = {
        "amount": amt,
        "tx_type": "TRANSFER",
        "sender_account": "1234567890",
        "receiver_account": "9876543210",
        "step": 14,
        "oldbalance_org": 50000.0, # sender only has 50,000 but sending huge amount!
        "newbalance_orig": 0.0,
        "location": "Hyderabad",
        "device_id": "ABC123",
        "description": "Payment"
    }
    feats = feature_engineer.extract_single(tx)
    xgb_p = xgb_predictor.predict_proba(feats)
    if_s = iso_forest_predictor.predict_anomaly_score(feats)
    res = initial_risk_aggregator.evaluate_initial_risk(tx)
    print(f"Amount: {amt:10,d} | XGB: {xgb_p:.4f} | IF: {if_s:.4f} | Initial Risk: {res['initial_risk_score']:.4f} | Needs Escalation: {res['needs_escalation']}")

print("\n--- WHAT IF SENDER HAS SUFFICIENT BALANCE? ---")
for amt in amounts:
    tx = {
        "amount": amt,
        "tx_type": "TRANSFER",
        "sender_account": "1234567890",
        "receiver_account": "9876543210",
        "step": 14,
        "oldbalance_org": amt * 1.5,
        "newbalance_orig": amt * 0.5,
        "location": "Hyderabad",
        "device_id": "ABC123",
        "description": "Payment"
    }
    feats = feature_engineer.extract_single(tx)
    xgb_p = xgb_predictor.predict_proba(feats)
    if_s = iso_forest_predictor.predict_anomaly_score(feats)
    res = initial_risk_aggregator.evaluate_initial_risk(tx)
    print(f"Amount: {amt:10,d} | XGB: {xgb_p:.4f} | IF: {if_s:.4f} | Initial Risk: {res['initial_risk_score']:.4f} | Needs Escalation: {res['needs_escalation']}")
