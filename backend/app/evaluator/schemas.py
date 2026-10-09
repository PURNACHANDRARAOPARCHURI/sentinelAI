from typing import List, Optional
from pydantic import BaseModel, Field

class EvaluatorStructuredOutput(BaseModel):
    recommendation: str = Field(..., description="APPROVE, STEP_UP_AUTH, or FLAG_FOR_HUMAN_REVIEW")
    risk_summary: str = Field(..., description="Concise evidence-grounded summary of detected risks")
    evidence_summary: str = Field(..., description="Summary of retrieved regulatory and behavioral evidence")
    contradictions: List[str] = Field(default_factory=list, description="Contradictions between model and agent outputs")
    missing_evidence: List[str] = Field(default_factory=list, description="Missing telemetry or unverified context")
    guardrail_status: str = Field("PASSED", description="PASSED or FLAGGED")
    requires_human_review: bool = Field(..., description="Whether transaction warrants human compliance triage")
    final_risk_score: float = Field(..., ge=0.0, le=1.0, description="Calibrated final composite risk score")
    model_version: str = Field("Qwen2.5-1.5B-Evaluator-v1", description="Evaluator model identifier")
