import os
import sys
sys.path.insert(0, ".")

from backend.app.ml.feature_engineering import feature_engineer
from backend.app.ml.xgboost_model import xgb_predictor
from backend.app.ml.isolation_forest_model import iso_forest_predictor
from backend.app.ml.initial_aggregator import initial_risk_aggregator

print("=== CASE 1: Amount == Balance (100% Account Drain) ===")
for amt in [10000, 50000, 200000, 500000, 1000000, 5000000, 10000000]:
    tx = {
        'amount': float(amt),
        'tx_type': 'TRANSFER',
        'sender_account': 'C123456789',
        'receiver_account': 'C987654321',
        'step': 14,
        'oldbalance_org': float(amt),
        'newbalance_orig': 0.0,
        'oldbalance_dest': 0.0,
        'newbalance_dest': 0.0
    }
    feats = feature_engineer.extract_single(tx)
    xgb_p = xgb_predictor.predict_proba(feats)
    if_s = iso_forest_predictor.predict_anomaly_score(feats)
    res = initial_risk_aggregator.evaluate_initial_risk(tx)
    print(f"Amt: {amt:10,d} | XGB: {xgb_p:.4f} | IF: {if_s:.4f} | Agg: {res['initial_risk_score']:.4f} | Needs Escalation: {res['needs_escalation']}")

print("\n=== CASE 2: Huge Amount with Default Small Balance (50,000) ===")
for amt in [10000, 50000, 200000, 500000, 1000000, 5000000, 10000000]:
    tx = {
        'amount': float(amt),
        'tx_type': 'TRANSFER',
        'sender_account': 'C123456789',
        'receiver_account': 'C987654321',
        'step': 14,
        'oldbalance_org': 50000.0,
        'newbalance_orig': 0.0,
        'oldbalance_dest': 0.0,
        'newbalance_dest': 0.0
    }
    feats = feature_engineer.extract_single(tx)
    xgb_p = xgb_predictor.predict_proba(feats)
    if_s = iso_forest_predictor.predict_anomaly_score(feats)
    res = initial_risk_aggregator.evaluate_initial_risk(tx)
    print(f"Amt: {amt:10,d} | XGB: {xgb_p:.4f} | IF: {if_s:.4f} | Agg: {res['initial_risk_score']:.4f} | Needs Escalation: {res['needs_escalation']}")
