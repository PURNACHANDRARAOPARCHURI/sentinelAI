import os
import json
import logging
import numpy as np
import xgboost as xgb
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class XGBoostFraudPredictor:
    """
    Inference service for Supervised XGBoost Fraud Classifier.
    Predicts calibrated fraud probability [0.0 - 1.0].
    """
    def __init__(self, model_path: Optional[str] = None):
        self.model: Optional[xgb.Booster] = None
        self.is_loaded = False
        
        if model_path is None:
            base_dir = Path(__file__).resolve().parent
            model_path = str(base_dir / "artifacts" / "xgboost_model.json")
            
        self.model_path = model_path
        self.load_model()

    def load_model(self) -> bool:
        if os.path.exists(self.model_path):
            try:
                self.model = xgb.Booster()
                self.model.load_model(self.model_path)
                self.is_loaded = True
                logger.info(f"Loaded XGBoost model from {self.model_path}")
                return True
            except Exception as e:
                logger.error(f"Failed to load XGBoost model: {e}")
                self.is_loaded = False
                return False
        else:
            logger.warning(f"XGBoost model file not found at {self.model_path}")
            self.is_loaded = False
            return False

    def predict_proba(self, features: np.ndarray) -> float:
        """
        Input: features 2D numpy array of shape (1, num_features)
        Returns: float probability between 0.0 and 1.0
        """
        if not self.is_loaded or self.model is None:
            # Fallback heuristic if model not loaded yet
            # e.g., flag large transfers with high balance depletion
            amount_log = features[0, 0]
            orig_depleted = features[0, 11]
            depletion_ratio = features[0, 13]
            is_large = features[0, 14]
            risk = 0.05
            if orig_depleted > 0.5:
                risk += 0.40
            if is_large > 0.5:
                risk += 0.35
            if depletion_ratio > 0.9:
                risk += 0.15
            return float(min(1.0, max(0.0, risk)))

        from backend.app.ml.feature_engineering import FEATURE_COLUMNS
        dmatrix = xgb.DMatrix(features, feature_names=FEATURE_COLUMNS)
        probs = self.model.predict(dmatrix)
        prob = float(probs[0])
        return float(np.clip(prob, 0.0, 1.0))

xgb_predictor = XGBoostFraudPredictor()
