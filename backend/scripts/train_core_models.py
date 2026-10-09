import os
import sys
import time
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix
)
from sklearn.ensemble import IsolationForest
import xgboost as xgb

# Add parent directory to sys.path so backend imports work
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.ml.feature_engineering import FinancialFeatureEngineer, FEATURE_COLUMNS

def find_paysim_csv():
    candidates = [
        r"C:\Users\purna\Downloads\archive (32)\paysim.csv",
        r"C:\Users\purna\Downloads\archive (36)\paysim.csv",
        r"C:\Users\purna\Downloads\paysim.csv",
        str(BASE_DIR / "data" / "paysim.csv")
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    raise FileNotFoundError("Could not locate paysim.csv in standard paths.")

def run_training():
    dataset_path = find_paysim_csv()
    print(f"[*] Loading PaySim dataset from: {dataset_path}")
    
    # Read dataset
    t0 = time.time()
    df = pd.read_csv(dataset_path)
    print(f"[+] Loaded {len(df):,} rows in {time.time() - t0:.2f}s")
    print(f"[*] Class distribution: Fraud={df['isFraud'].sum():,} ({df['isFraud'].mean()*100:.3f}%), Legit={(df['isFraud']==0).sum():,}")

    # Feature extraction
    print("[*] Engineering features...")
    fe = FinancialFeatureEngineer()
    X = fe.extract_dataframe(df)
    y = df["isFraud"].values.astype(int)

    # Chronological holdout split based on step
    # PaySim steps represent hours. Split by 80th percentile of step
    step_cutoff = df["step"].quantile(0.80)
    train_mask = (df["step"] <= step_cutoff).values
    test_mask = (df["step"] > step_cutoff).values

    # Check that both sets contain positive cases
    if y[test_mask].sum() == 0 or y[train_mask].sum() == 0:
        print("[!] Warning: Chronological split had zero fraud in test. Using stratified 80/20.")
        from sklearn.model_selection import train_test_split
        train_idx, test_idx = train_test_split(np.arange(len(y)), test_size=0.20, random_state=42, stratify=y)
        train_mask = np.zeros(len(y), dtype=bool)
        train_mask[train_idx] = True
        test_mask = ~train_mask

    X_train, y_train = X.iloc[train_mask], y[train_mask]
    X_test, y_test = X.iloc[test_mask], y[test_mask]

    print(f"[+] Train set: {len(X_train):,} samples (Fraud={y_train.sum():,})")
    print(f"[+] Test set:  {len(X_test):,} samples (Fraud={y_test.sum():,})")

    # -------------------------------------------------------------
    # MODEL A: XGBoost Supervised
    # -------------------------------------------------------------
    print("\n" + "="*50)
    print("TRAINING MODEL A: XGBoost (Supervised)")
    print("="*50)

    neg_count = (y_train == 0).sum()
    pos_count = max(1, (y_train == 1).sum())
    scale_pos_weight = float(neg_count) / float(pos_count)
    print(f"[*] Computed scale_pos_weight: {scale_pos_weight:.2f}")

    xgb_clf = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        tree_method="hist",
        n_jobs=-1,
        eval_metric="aucpr"
    )

    t_train_xgb = time.time()
    xgb_clf.fit(X_train, y_train)
    xgb_train_duration = time.time() - t_train_xgb
    print(f"[+] XGBoost training finished in {xgb_train_duration:.2f}s")

    # Evaluate XGBoost
    y_test_probs = xgb_clf.predict_proba(X_test)[:, 1]
    y_test_pred = (y_test_probs >= 0.50).astype(int)

    xgb_acc = float(accuracy_score(y_test, y_test_pred))
    xgb_prec = float(precision_score(y_test, y_test_pred, zero_division=0))
    xgb_rec = float(recall_score(y_test, y_test_pred, zero_division=0))
    xgb_f1 = float(f1_score(y_test, y_test_pred, zero_division=0))
    xgb_roc_auc = float(roc_auc_score(y_test, y_test_probs))
    xgb_pr_auc = float(average_precision_score(y_test, y_test_probs))
    cm_xgb = confusion_matrix(y_test, y_test_pred)
    tn, fp, fn, tp = cm_xgb.ravel()
    fpr_xgb = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    # Latency benchmark
    sample_x = X_test.iloc[:100]
    t_lat = time.time()
    _ = xgb_clf.predict_proba(sample_x)
    xgb_latency_per_sample_ms = ((time.time() - t_lat) / 100.0) * 1000.0

    print(f"--- XGBoost Held-out Evaluation ---")
    print(f"Accuracy:        {xgb_acc*100:.2f}% (Target > 80%: {'PASS' if xgb_acc >= 0.80 else 'FAIL'})")
    print(f"Precision:       {xgb_prec*100:.2f}%")
    print(f"Recall:          {xgb_rec*100:.2f}%")
    print(f"F1 Score:        {xgb_f1*100:.2f}%")
    print(f"ROC-AUC:         {xgb_roc_auc:.4f}")
    print(f"PR-AUC:          {xgb_pr_auc:.4f}")
    print(f"False Pos Rate:  {fpr_xgb*100:.3f}%")
    print(f"Latency/Sample:  {xgb_latency_per_sample_ms:.3f} ms")
    print(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

    # -------------------------------------------------------------
    # MODEL B: Isolation Forest Unsupervised
    # -------------------------------------------------------------
    print("\n" + "="*50)
    print("TRAINING MODEL B: Isolation Forest (Unsupervised)")
    print("="*50)

    # Train only on legitimate transactions from train set
    X_train_legit = X_train[y_train == 0]
    # Sample down to 100,000 for low memory and fast training if large
    if len(X_train_legit) > 100000:
        X_train_legit_sample = X_train_legit.sample(n=100000, random_state=42)
    else:
        X_train_legit_sample = X_train_legit

    iso_forest = IsolationForest(
        n_estimators=100,
        max_samples=512,
        contamination=0.005,
        random_state=42,
        n_jobs=-1
    )

    t_train_if = time.time()
    iso_forest.fit(X_train_legit_sample)
    if_train_duration = time.time() - t_train_if
    print(f"[+] Isolation Forest trained in {if_train_duration:.2f}s")

    # Evaluate Isolation Forest on hold-out set
    # raw score: lower score means more abnormal.
    # Invert so higher score = more anomalous: anomaly_raw = -decision_function
    raw_dec = iso_forest.decision_function(X_test)
    raw_anomaly = -raw_dec
    # Calibrate to [0, 1] range using sigmoid or min-max
    p05 = np.percentile(raw_anomaly, 1)
    p99 = np.percentile(raw_anomaly, 99)
    calibrated_if_scores = np.clip((raw_anomaly - p05) / (p99 - p05 + 1e-6), 0.0, 1.0)

    # Threshold calibration for anomaly classification
    if_threshold = 0.65
    y_if_pred = (calibrated_if_scores >= if_threshold).astype(int)

    if_acc = float(accuracy_score(y_test, y_if_pred))
    if_prec = float(precision_score(y_test, y_if_pred, zero_division=0))
    if_rec = float(recall_score(y_test, y_if_pred, zero_division=0))
    if_f1 = float(f1_score(y_test, y_if_pred, zero_division=0))
    if_roc_auc = float(roc_auc_score(y_test, calibrated_if_scores))
    if_pr_auc = float(average_precision_score(y_test, calibrated_if_scores))
    cm_if = confusion_matrix(y_test, y_if_pred)
    tn_i, fp_i, fn_i, tp_i = cm_if.ravel()
    fpr_if = float(fp_i / (fp_i + tn_i)) if (fp_i + tn_i) > 0 else 0.0

    t_lat_if = time.time()
    _ = iso_forest.decision_function(sample_x)
    if_latency_per_sample_ms = ((time.time() - t_lat_if) / 100.0) * 1000.0

    print(f"--- Isolation Forest Held-out Evaluation ---")
    print(f"Accuracy:        {if_acc*100:.2f}% (Target > 80%: {'PASS' if if_acc >= 0.80 else 'FAIL'})")
    print(f"Precision:       {if_prec*100:.2f}%")
    print(f"Recall:          {if_rec*100:.2f}%")
    print(f"F1 Score:        {if_f1*100:.2f}%")
    print(f"ROC-AUC:         {if_roc_auc:.4f}")
    print(f"PR-AUC:          {if_pr_auc:.4f}")
    print(f"False Pos Rate:  {fpr_if*100:.3f}%")
    print(f"Latency/Sample:  {if_latency_per_sample_ms:.3f} ms")
    print(f"Confusion Matrix: TN={tn_i}, FP={fp_i}, FN={fn_i}, TP={tp_i}")

    # -------------------------------------------------------------
    # SAVE MODEL ARTIFACTS
    # -------------------------------------------------------------
    artifacts_dir = BASE_DIR / "backend" / "app" / "ml" / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    
    # Save XGBoost
    xgb_model_path = artifacts_dir / "xgboost_model.json"
    xgb_clf.save_model(str(xgb_model_path))
    print(f"[+] Saved XGBoost model to: {xgb_model_path}")

    # Save Isolation Forest
    if_model_path = artifacts_dir / "isolation_forest_model.joblib"
    joblib.dump(iso_forest, str(if_model_path))
    print(f"[+] Saved Isolation Forest model to: {if_model_path}")

    # Save calibration metadata & feature schema
    schema_metadata = {
        "features": FEATURE_COLUMNS,
        "n_features": len(FEATURE_COLUMNS),
        "scale_pos_weight": scale_pos_weight,
        "if_calibration": {
            "p05": float(p05),
            "p99": float(p99),
            "threshold": if_threshold
        },
        "training_date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "dataset_rows": len(df),
        "train_rows": len(X_train),
        "test_rows": len(X_test)
    }
    with open(artifacts_dir / "feature_schema.json", "w") as f:
        json.dump(schema_metadata, f, indent=2)

    # -------------------------------------------------------------
    # SAVE EVALUATION REPORTS
    # -------------------------------------------------------------
    reports_dir = BASE_DIR / "evaluation_reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    xgb_report = {
        "model_name": "XGBoost Classifier (Supervised)",
        "model_version": "1.0.0",
        "accuracy": xgb_acc,
        "precision": xgb_prec,
        "recall": xgb_rec,
        "f1_score": xgb_f1,
        "roc_auc": xgb_roc_auc,
        "pr_auc": xgb_pr_auc,
        "false_positive_rate": fpr_xgb,
        "inference_latency_ms": xgb_latency_per_sample_ms,
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        },
        "target_accuracy_met": xgb_acc >= 0.80,
        "hyperparameters": {
            "n_estimators": 120,
            "max_depth": 6,
            "learning_rate": 0.1,
            "scale_pos_weight": scale_pos_weight
        }
    }
    with open(reports_dir / "xgboost_evaluation.json", "w") as f:
        json.dump(xgb_report, f, indent=2)

    if_report = {
        "model_name": "Isolation Forest (Unsupervised Anomaly Detector)",
        "model_version": "1.0.0",
        "accuracy": if_acc,
        "precision": if_prec,
        "recall": if_rec,
        "f1_score": if_f1,
        "roc_auc": if_roc_auc,
        "pr_auc": if_pr_auc,
        "false_positive_rate": fpr_if,
        "inference_latency_ms": if_latency_per_sample_ms,
        "confusion_matrix": {
            "true_negatives": int(tn_i),
            "false_positives": int(fp_i),
            "false_negatives": int(fn_i),
            "true_positives": int(tp_i)
        },
        "target_accuracy_met": if_acc >= 0.80,
        "hyperparameters": {
            "n_estimators": 100,
            "max_samples": 512,
            "contamination": 0.005
        }
    }
    with open(reports_dir / "isolation_forest_evaluation.json", "w") as f:
        json.dump(if_report, f, indent=2)

    print("\n[+] SUCCESS: Both models trained and evaluated. Reports saved.")

if __name__ == "__main__":
    run_training()
