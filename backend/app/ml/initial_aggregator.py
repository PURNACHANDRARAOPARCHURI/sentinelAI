import time
import logging
from typing import Dict, Any, Tuple
import numpy as np

from backend.app.core.config import settings
from backend.app.ml.feature_engineering import feature_engineer
from backend.app.ml.xgboost_model import xgb_predictor
from backend.app.ml.isolation_forest_model import iso_forest_predictor

logger = logging.getLogger(__name__)

class InitialRiskAggregator:
    """
    Initial Risk Aggregator (ML Scores)
    Combines Supervised XGBoost Fraud Probability and Unsupervised Isolation Forest Anomaly Score.
    Determines Fast-Path Approval vs Escalation to LangGraph Parallel Multi-Agent Orchestration.
    """
    def __init__(self):
        self.xgb_weight = settings.XGBOOST_WEIGHT
        self.if_weight = settings.ISOLATION_FOREST_WEIGHT
        self.escalation_threshold = settings.INITIAL_RISK_THRESHOLD

    def evaluate_initial_risk(self, tx_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes feature extraction, ML inference, and calibrated initial risk aggregation.
        Combines Supervised XGBoost Probability and Unsupervised Isolation Forest Anomaly Score
        with RBI/AML monetary exposure tiers and balance deficit penalties.
        Determines Fast-Path Approval (< 0.30) vs Escalation to LangGraph Multi-Agent Orchestration (> 0.30).
        """
        t0 = time.time()
        amount = float(tx_data.get("amount", 0.0))
        old_orig = float(tx_data.get("oldbalance_org", 0.0) if tx_data.get("oldbalance_org") is not None else amount)
        is_deficit = bool(amount > old_orig)
        
        # 1. Feature Engineering
        features = feature_engineer.extract_single(tx_data)
        
        # 2. Supervised XGBoost Inference
        t_xgb = time.time()
        xgb_prob = float(xgb_predictor.predict_proba(features))
        xgb_lat = (time.time() - t_xgb) * 1000.0
        
        # 3. Unsupervised Isolation Forest Inference
        t_if = time.time()
        if_score = float(iso_forest_predictor.predict_anomaly_score(features))
        if_lat = (time.time() - t_if) * 1000.0
        
        # 4. Multi-Layer Calibrated Risk Aggregation
        total_w = self.xgb_weight + self.if_weight
        w_xgb = self.xgb_weight / total_w
        w_if = self.if_weight / total_w
        
        base_ml_score = (w_xgb * xgb_prob) + (w_if * if_score)
        
        # Anomaly Floor: Unsupervised anomaly flags must not be diluted by supervised uncertainty
        if if_score >= 0.60:
            base_ml_score = max(base_ml_score, if_score * 0.70)

        # Monetary Exposure Factor (RBI AML/CFT tiered thresholds)
        monetary_exposure = 0.0
        if amount >= 5000000.0:       # >= ₹50 Lakhs (Ultra-high value)
            monetary_exposure = 0.40
        elif amount >= 1000000.0:     # >= ₹10 Lakhs (High-value wire)
            monetary_exposure = 0.30
        elif amount >= 500000.0:      # >= ₹5 Lakhs (Mandatory monitoring threshold)
            monetary_exposure = 0.20
        elif amount >= 200000.0:      # >= ₹2 Lakhs (RTGS threshold)
            monetary_exposure = 0.12
        elif amount >= 50000.0:       # >= ₹50,000 (Significant transfer)
            monetary_exposure = 0.05

        # Balance Deficit / Overdraft Penalty
        deficit_penalty = 0.0
        if is_deficit:
            deficit_penalty = 0.35

        # Calibrated Aggregated Score
        aggregated_score = base_ml_score + monetary_exposure + deficit_penalty
        aggregated_score = float(np.clip(aggregated_score, 0.0, 1.0))
        
        # 5. Routing Condition: Trigger multi-agent escalation if score exceeds threshold,
        # or if mandatory high-value, deficit, or strong anomaly triggers fire
        needs_escalation = bool(
            aggregated_score > self.escalation_threshold or
            amount >= 500000.0 or
            is_deficit or
            if_score >= 0.60
        )
        
        total_lat = (time.time() - t0) * 1000.0
        
        # Reasoning signals
        signals = []
        if is_deficit:
            signals.append(f"Attempted transfer (INR {amount:,.0f}) exceeds available ledger balance (INR {old_orig:,.0f}) — Deficit anomaly")
        if amount >= 500000:
            signals.append(f"High-value monetary exposure (INR {amount:,.0f}) requires mandatory multi-agent regulatory scrutiny")
        elif amount >= 200000:
            signals.append(f"Elevated transaction amount (INR {amount:,.0f}) exceeds standard retail threshold")
        if xgb_prob >= 0.5:
            signals.append(f"XGBoost detected high fraud pattern (P={xgb_prob:.2f})")
        if if_score >= 0.6:
            signals.append(f"Isolation Forest flagged behavioral anomaly (Score={if_score:.2f})")
        if not signals:
            signals.append("Normal transactional pattern, low statistical divergence")

        return {
            "xgboost_prob": round(xgb_prob, 4),
            "isolation_forest_score": round(if_score, 4),
            "initial_risk_score": round(aggregated_score, 4),
            "escalation_threshold": self.escalation_threshold,
            "needs_escalation": needs_escalation,
            "fast_path_approved": not needs_escalation,
            "initial_signals": signals,
            "latency_ms": round(total_lat, 2),
            "model_versions": {
                "xgboost": "1.0.0",
                "isolation_forest": "1.0.0"
            }
        }

initial_risk_aggregator = InitialRiskAggregator()
