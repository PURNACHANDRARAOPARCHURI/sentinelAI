import os
import json
import logging
import joblib
import numpy as np
from pathlib import Path
from typing import Optional
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

class IsolationForestAnomalyPredictor:
    """
    Inference service for Unsupervised Isolation Forest Anomaly Detector.
    Converts raw decision function into calibrated anomaly score in [0.0, 1.0].
    """
    def __init__(self, model_path: Optional[str] = None):
        self.model: Optional[IsolationForest] = None
        self.is_loaded = False
        self.p05 = -0.20
        self.p99 = 0.20
        
        base_dir = Path(__file__).resolve().parent
        if model_path is None:
            model_path = str(base_dir / "artifacts" / "isolation_forest_model.joblib")
            
        self.model_path = model_path
        self.schema_path = str(base_dir / "artifacts" / "feature_schema.json")
        self.load_model()

    def load_model(self) -> bool:
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                self.is_loaded = True
                
                # Load calibration parameters
                if os.path.exists(self.schema_path):
                    with open(self.schema_path, "r") as f:
                        meta = json.load(f)
                        calib = meta.get("if_calibration", {})
                        self.p05 = calib.get("p05", -0.20)
                        self.p99 = calib.get("p99", 0.20)
                        
                logger.info(f"Loaded Isolation Forest from {self.model_path}")
                return True
            except Exception as e:
                logger.error(f"Failed to load Isolation Forest: {e}")
                self.is_loaded = False
                return False
        else:
            logger.warning(f"Isolation Forest model file not found at {self.model_path}")
            self.is_loaded = False
            return False

    def predict_anomaly_score(self, features: np.ndarray) -> float:
        """
        Calculates calibrated anomaly score in [0.0, 1.0].
        Higher score = more anomalous.
        """
        if not self.is_loaded or self.model is None:
            # Fallback heuristic
            is_large = features[0, 14]
            dep_ratio = features[0, 13]
            is_night = features[0, 15]
            raw = 0.10 + 0.3 * is_large + 0.2 * is_night + 0.3 * min(1.0, dep_ratio)
            return float(np.clip(raw, 0.0, 1.0))

        # raw_dec: lower values mean more anomalous
        raw_dec = float(self.model.decision_function(features)[0])
        # Invert: higher means more anomalous
        raw_anomaly = -raw_dec
        
        # Min-max scale based on training percentiles
        score = (raw_anomaly - self.p05) / (self.p99 - self.p05 + 1e-6)
        return float(np.clip(score, 0.0, 1.0))

iso_forest_predictor = IsolationForestAnomalyPredictor()
