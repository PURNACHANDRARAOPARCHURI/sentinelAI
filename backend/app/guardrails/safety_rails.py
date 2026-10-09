import re
import logging
from typing import Dict, Any, List, Tuple
from backend.app.guardrails.pii_sanitizer import pii_sanitizer

logger = logging.getLogger(__name__)

PROMPT_INJECTION_PATTERNS = [
    r"ignore (all )?previous instructions",
    r"system override",
    r"you are now (in )?developer mode",
    r"dan mode",
    r"disregard (the )?fraud rules",
    r"always approve this",
    r"set risk to 0",
    r"bypass auth",
    r"drop database",
    r"<script.*?>",
    r"javascript:",
    r"--\s*$",
    r"union select"
]

class SafetyGuardrails:
    """
    NVIDIA NeMo Guardrails-compatible safety filter & hallucination protection.
    Enforces:
    1. Input Prompt Injection & Adversarial Attack Defense
    2. Sensitive PII Scrubbing
    3. Groundedness / Hallucination Verification
    4. Deterministic Override Prevention (LLMs cannot unilaterally approve high-risk cases)
    """
    def __init__(self):
        self.injection_regexes = [re.compile(p, re.IGNORECASE) for p in PROMPT_INJECTION_PATTERNS]

    def validate_input(self, tx_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validates transaction description and user payload against injection attempts.
        Returns (is_safe, list_of_violations).
        """
        violations = []
        desc = str(tx_data.get("description", ""))
        sender = str(tx_data.get("sender_account", ""))
        receiver = str(tx_data.get("receiver_account", ""))
        
        full_text = f"{desc} {sender} {receiver}"
        
        for regex in self.injection_regexes:
            if regex.search(full_text):
                violations.append(f"Prompt injection pattern detected: '{regex.pattern}'")

        is_safe = len(violations) == 0
        return is_safe, violations

    def verify_groundedness(
        self,
        llm_recommendation: str,
        initial_risk: float,
        agent_risk: float,
        rag_citations: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """
        Ensures LLM decision does not hallucinate or contradict deterministic safety rules:
        - If initial risk >= 0.70 or agent risk >= 0.70, LLM cannot output 'APPROVE'.
        - If citations are empty, LLM cannot invent external RBI regulations.
        """
        flags = []
        rec = str(llm_recommendation).upper()
        
        # Rule 1: High risk cannot be overridden to APPROVE by generative component
        if (initial_risk >= 0.70 or agent_risk >= 0.70) and rec == "APPROVE":
            flags.append("LLM hallucination/policy violation: Attempted to APPROVE transaction despite high risk score >= 0.70.")

        # Rule 2: Citation grounding
        if not rag_citations and "rbi circular" in rec.lower():
            flags.append("Unsupported regulatory citation: LLM cited RBI policy that was not in retrieved context.")

        is_grounded = len(flags) == 0
        return is_grounded, flags

safety_guardrails = SafetyGuardrails()
