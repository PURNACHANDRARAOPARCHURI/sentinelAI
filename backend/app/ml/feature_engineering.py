import numpy as np
import pandas as pd
from typing import Dict, Any, List, Union

FEATURE_COLUMNS = [
    "amount_log",
    "hour_of_day",
    "hour_sin",
    "hour_cos",
    "is_transfer",
    "is_cash_out",
    "is_payment",
    "is_debit",
    "is_cash_in",
    "error_balance_orig",
    "error_balance_dest",
    "orig_depleted",
    "dest_balance_zero",
    "depletion_ratio",
    "is_large_transaction",
    "is_night_transaction"
]

class FinancialFeatureEngineer:
    """
    Production Feature Engineering Pipeline for SentinelAI Banking Transactions.
    Extracts temporal, balance discrepancy, and behavioral risk features
    from raw PaySim transaction schemas.
    """
    def __init__(self):
        self.feature_names = FEATURE_COLUMNS

    def extract_single(self, tx: Dict[str, Any]) -> np.ndarray:
        """
        Extract features from a single transaction dictionary.
        Returns 2D numpy array of shape (1, num_features).
        """
        amount = float(tx.get("amount", 0.0))
        tx_type = str(tx.get("tx_type", "TRANSFER")).upper()
        step = int(tx.get("step", 1))
        
        # Sender balance handling
        old_orig = float(tx.get("oldbalance_org", 0.0) if tx.get("oldbalance_org") is not None else amount)
        new_orig = float(tx.get("newbalance_orig", 0.0) if tx.get("newbalance_orig") is not None else max(0.0, old_orig - amount))
        
        # Receiver balance handling
        old_dest = float(tx.get("oldbalance_dest", 0.0) if tx.get("oldbalance_dest") is not None else 0.0)
        new_dest = float(tx.get("newbalance_dest", 0.0) if tx.get("newbalance_dest") is not None else old_dest + amount)

        # 1. Amount features
        amount_log = np.log1p(max(0.0, amount))
        is_large = 1.0 if amount >= 200000.0 else 0.0

        # 2. Temporal features (step represents hour index)
        hour = step % 24
        hour_sin = np.sin(2 * np.pi * hour / 24.0)
        hour_cos = np.cos(2 * np.pi * hour / 24.0)
        is_night = 1.0 if (hour >= 23 or hour <= 5) else 0.0

        # 3. Categorical Type One-Hot Flags
        is_transfer = 1.0 if tx_type == "TRANSFER" else 0.0
        is_cash_out = 1.0 if tx_type == "CASH_OUT" else 0.0
        is_payment  = 1.0 if tx_type == "PAYMENT" else 0.0
        is_debit    = 1.0 if tx_type == "DEBIT" else 0.0
        is_cash_in  = 1.0 if tx_type == "CASH_IN" else 0.0

        # 4. Balance Discrepancy & Account Depletion
        # When old_orig < amount, the sender attempts an overdraft / deficit transaction.
        # In PaySim decision trees, positive error_orig (> 1000) falsely routes to legitimate classes.
        # For deficit cases, clamp error_orig to 0.0 and flag orig_depleted = 1.0.
        if old_orig < amount:
            error_balance_orig = 0.0
            orig_depleted = 1.0
            depletion_ratio = 10.0
        else:
            error_balance_orig = (new_orig + amount) - old_orig
            orig_depleted = 1.0 if (new_orig == 0.0 and old_orig > 0.0) else 0.0
            depletion_ratio = amount / (old_orig + 1.0)
            depletion_ratio = min(10.0, max(0.0, depletion_ratio))

        error_balance_dest = (old_dest + amount) - new_dest
        dest_balance_zero = 1.0 if (old_dest == 0.0 and new_dest == 0.0) else 0.0

        features = [
            amount_log,
            float(hour),
            hour_sin,
            hour_cos,
            is_transfer,
            is_cash_out,
            is_payment,
            is_debit,
            is_cash_in,
            error_balance_orig,
            error_balance_dest,
            orig_depleted,
            dest_balance_zero,
            depletion_ratio,
            is_large,
            is_night
        ]
        return np.array([features], dtype=np.float32)

    def extract_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract features from a batch DataFrame (PaySim schema).
        Columns expected: step, type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest
        """
        feat_df = pd.DataFrame()
        
        # 1. Amount
        feat_df["amount_log"] = np.log1p(np.maximum(0.0, df["amount"]))
        
        # 2. Temporal
        hour = df["step"] % 24
        feat_df["hour_of_day"] = hour.astype(float)
        feat_df["hour_sin"] = np.sin(2 * np.pi * hour / 24.0)
        feat_df["hour_cos"] = np.cos(2 * np.pi * hour / 24.0)
        
        # 3. Categorical types
        type_upper = df["type"].str.upper()
        feat_df["is_transfer"] = (type_upper == "TRANSFER").astype(float)
        feat_df["is_cash_out"] = (type_upper == "CASH_OUT").astype(float)
        feat_df["is_payment"]  = (type_upper == "PAYMENT").astype(float)
        feat_df["is_debit"]    = (type_upper == "DEBIT").astype(float)
        feat_df["is_cash_in"]  = (type_upper == "CASH_IN").astype(float)
        
        # 4. Balance features
        feat_df["error_balance_orig"] = (df["newbalanceOrig"] + df["amount"]) - df["oldbalanceOrg"]
        deficit_mask = df["oldbalanceOrg"] < df["amount"]
        feat_df.loc[deficit_mask, "error_balance_orig"] = 0.0

        feat_df["error_balance_dest"] = (df["oldbalanceDest"] + df["amount"]) - df["newbalanceDest"]
        
        feat_df["orig_depleted"] = (((df["newbalanceOrig"] == 0.0) & (df["oldbalanceOrg"] > 0.0)) | deficit_mask).astype(float)
        feat_df["dest_balance_zero"] = ((df["oldbalanceDest"] == 0.0) & (df["newbalanceDest"] == 0.0)).astype(float)
        
        dep_ratio = df["amount"] / (df["oldbalanceOrg"] + 1.0)
        dep_ratio = dep_ratio.mask(deficit_mask, 10.0)
        feat_df["depletion_ratio"] = dep_ratio.clip(0.0, 10.0)
        
        feat_df["is_large_transaction"] = (df["amount"] >= 200000.0).astype(float)
        feat_df["is_night_transaction"] = ((hour >= 23) | (hour <= 5)).astype(float)
        
        return feat_df[FEATURE_COLUMNS]

feature_engineer = FinancialFeatureEngineer()
