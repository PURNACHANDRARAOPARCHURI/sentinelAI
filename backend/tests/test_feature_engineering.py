import pytest
import numpy as np
from backend.app.ml.feature_engineering import feature_engineer, FEATURE_COLUMNS
from backend.app.ml.initial_aggregator import initial_risk_aggregator

def test_feature_extraction_single():
    tx = {
        "amount": 1000.0,
        "tx_type": "TRANSFER",
        "step": 14,
        "oldbalance_org": 2000.0,
        "newbalance_orig": 1000.0,
        "oldbalance_dest": 500.0,
        "newbalance_dest": 1500.0
    }
    feats = feature_engineer.extract_single(tx)
    assert isinstance(feats, np.ndarray)
    assert feats.shape == (1, len(FEATURE_COLUMNS))
    assert feats[0, 4] == 1.0  # is_transfer
    assert feats[0, 5] == 0.0  # is_cash_out

def test_low_risk_fast_path():
    tx_low = {
        "amount": 25.0,
        "tx_type": "PAYMENT",
        "step": 14,
        "oldbalance_org": 5000.0,
        "newbalance_orig": 4975.0,
        "oldbalance_dest": 1000.0,
        "newbalance_dest": 1025.0
    }
    result = initial_risk_aggregator.evaluate_initial_risk(tx_low)
    assert "initial_risk_score" in result
    assert "fast_path_approved" in result
    assert result["fast_path_approved"] is True
    assert result["initial_risk_score"] <= 0.30

def test_high_risk_escalation():
    # Large account emptying transfer: classic PaySim fraud pattern
    tx_fraud = {
        "amount": 950000.0,
        "tx_type": "TRANSFER",
        "step": 2,
        "oldbalance_org": 950000.0,
        "newbalance_orig": 0.0,
        "oldbalance_dest": 0.0,
        "newbalance_dest": 0.0
    }
    result = initial_risk_aggregator.evaluate_initial_risk(tx_fraud)
    assert result["needs_escalation"] is True
    assert result["initial_risk_score"] > 0.30
    assert result["xgboost_prob"] > 0.50

def test_deficit_overdraft_escalation():
    # Deficit / unauthorized overdraft: amount far exceeds sender ledger balance
    tx_deficit = {
        "amount": 5000000.0,
        "tx_type": "TRANSFER",
        "step": 14,
        "oldbalance_org": 50000.0,
        "newbalance_orig": 0.0,
        "oldbalance_dest": 0.0,
        "newbalance_dest": 0.0
    }
    result = initial_risk_aggregator.evaluate_initial_risk(tx_deficit)
    assert result["needs_escalation"] is True
    assert result["initial_risk_score"] >= 0.70
    assert any("Deficit" in s for s in result["initial_signals"])

def test_high_value_tier_escalation():
    # High-value transfer exceeding retail threshold even with sufficient balance
    tx_high_val = {
        "amount": 1000000.0,
        "tx_type": "TRANSFER",
        "step": 14,
        "oldbalance_org": 1200000.0,
        "newbalance_orig": 200000.0,
        "oldbalance_dest": 50000.0,
        "newbalance_dest": 1050000.0
    }
    result = initial_risk_aggregator.evaluate_initial_risk(tx_high_val)
    assert result["needs_escalation"] is True
    assert result["initial_risk_score"] >= 0.40
