import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.models.db_models import User, Transaction, AgentInvestigation, HumanReviewCase
from backend.app.core.security import get_password_hash
from backend.app.api.v1.router import api_router
from backend.app.ml.xgboost_model import xgb_predictor
from backend.app.ml.isolation_forest_model import iso_forest_predictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sentinel_ai")

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Default Users
        if db.query(User).count() == 0:
            logger.info("Seeding initial default users...")
            users = [
                User(
                    username="admin",
                    email="admin@sentinelai.bank",
                    hashed_password=get_password_hash("AdminPassword123!"),
                    role="admin",
                    full_name="Chief Risk Officer"
                ),
                User(
                    username="analyst",
                    email="analyst@sentinelai.bank",
                    hashed_password=get_password_hash("AnalystPassword123!"),
                    role="analyst",
                    full_name="Lead Fraud Analyst"
                ),
                User(
                    username="investigator",
                    email="investigator@sentinelai.bank",
                    hashed_password=get_password_hash("InvestigatorPassword123!"),
                    role="investigator",
                    full_name="Senior Forensic Investigator"
                )
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Initial Demonstration Transactions if DB is empty
        if db.query(Transaction).count() == 0:
            logger.info("Seeding initial demonstration transactions...")
            seed_data = [
                # Fast Path Approved (Low Risk)
                {
                    "id": "tx-demo-001",
                    "amount": 450.0,
                    "tx_type": "PAYMENT",
                    "sender_account": "C819238471",
                    "receiver_account": "M928374112",
                    "step": 14,
                    "location": "Mumbai, IN",
                    "device_id": "DEV-APP-01",
                    "description": "Starbucks Coffee & Snacks",
                    "oldbalance_org": 25000.0,
                    "newbalance_orig": 24550.0,
                    "oldbalance_dest": 100000.0,
                    "newbalance_dest": 100450.0,
                    "xgboost_prob": 0.0001,
                    "isolation_forest_score": 0.08,
                    "initial_risk_score": 0.024,
                    "agent_risk_score": None,
                    "final_risk_score": 0.024,
                    "decision": "APPROVE",
                    "status": "APPROVED",
                    "escalated_to_agents": False,
                    "latency_ms": 1.2
                },
                # Step-Up Auth (Medium Risk)
                {
                    "id": "tx-demo-002",
                    "amount": 85000.0,
                    "tx_type": "TRANSFER",
                    "sender_account": "C192837465",
                    "receiver_account": "C551928374",
                    "step": 23, # 23:00 off-hours
                    "location": "Bengaluru, IN",
                    "device_id": "DEV-APP-09",
                    "description": "Urgent wire transfer to external contractor",
                    "oldbalance_org": 120000.0,
                    "newbalance_orig": 35000.0,
                    "oldbalance_dest": 0.0,
                    "newbalance_dest": 85000.0,
                    "xgboost_prob": 0.38,
                    "isolation_forest_score": 0.58,
                    "initial_risk_score": 0.44,
                    "agent_risk_score": 0.52,
                    "final_risk_score": 0.484,
                    "decision": "STEP_UP_AUTH",
                    "status": "OTP_PENDING",
                    "escalated_to_agents": True,
                    "latency_ms": 28.5
                },
                # Critical Fraud - Escalated & Flagged for Review (High Risk)
                {
                    "id": "tx-demo-003",
                    "amount": 950000.0,
                    "tx_type": "TRANSFER",
                    "sender_account": "C998877665",
                    "receiver_account": "C112233445",
                    "step": 2, # 02:00 off-hours
                    "location": "Unknown / Proxy IP",
                    "device_id": "UNRECOGNIZED-DEV-99",
                    "description": "Urgent crypto p2p liquidation fee payout",
                    "oldbalance_org": 950000.0,
                    "newbalance_orig": 0.0, # Complete liquidation
                    "oldbalance_dest": 0.0,
                    "newbalance_dest": 0.0,
                    "xgboost_prob": 0.998,
                    "isolation_forest_score": 0.89,
                    "initial_risk_score": 0.965,
                    "agent_risk_score": 0.88,
                    "final_risk_score": 0.923,
                    "decision": "HUMAN_REVIEW",
                    "status": "IN_REVIEW",
                    "escalated_to_agents": True,
                    "latency_ms": 42.1
                }
            ]
            for s in seed_data:
                tx = Transaction(**s)
                db.add(tx)
                db.flush()

                if s["escalated_to_agents"]:
                    inv = AgentInvestigation(
                        transaction_id=tx.id,
                        behavioral_score=0.92 if s["amount"] > 500000 else 0.55,
                        behavioral_explanation="Critical balance depletion (>90% of funds drained); origin account completely zeroed out.",
                        behavioral_indicators={"depletion_ratio": 1.0, "account_wiped": True, "off_hours": True},
                        context_category="CRYPTO_PURCHASE" if s["amount"] > 500000 else "URGENT_UNVERIFIED_WIRE",
                        context_score=0.85 if s["amount"] > 500000 else 0.78,
                        context_explanation="Classified context as High Risk cryptocurrency liquidation intent.",
                        rag_score=0.85,
                        rag_citations=[
                            {"section": "Account Depletion Anomaly Rule (AD-01)", "excerpt": "Outgoing amount constitutes >=90% of ledger balance."},
                            {"section": "RBI Mule Account Identification Indicators", "excerpt": "Immediate withdrawal leaving zero balance."}
                        ],
                        rag_explanation="Matched 2 regulatory and internal compliance rules indicating acute loss liability.",
                        summary_text="Investigation concludes high probability account takeover and liquidation.",
                        aggregated_agent_score=0.88,
                        guardrail_status="PASSED",
                        llm_recommendation="FLAG_FOR_HUMAN_REVIEW" if s["amount"] > 500000 else "STEP_UP_AUTH",
                        llm_risk_summary=f"Composite risk score calibrated at {s['final_risk_score']:.2f}.",
                        contradictions=[],
                        missing_evidence=["Device hardware fingerprint absent from payload."] if s["amount"] > 500000 else []
                    )
                    db.add(inv)

                if s["decision"] == "HUMAN_REVIEW":
                    rc = HumanReviewCase(
                        transaction_id=tx.id,
                        status="PENDING",
                        priority="CRITICAL",
                        assigned_to=None,
                        reviewer_notes=None
                    )
                    db.add(rc)

            db.commit()
            logger.info("Seed data inserted successfully.")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SentinelAI Application...")
    init_db()
    # Verify model loading
    xgb_predictor.load_model()
    iso_forest_predictor.load_model()
    logger.info(f"XGBoost loaded: {xgb_predictor.is_loaded}, Isolation Forest loaded: {iso_forest_predictor.is_loaded}")
    yield
    logger.info("Shutting down SentinelAI Application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Multi-Agent Banking Fraud Detection System (100% Open Source)",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all for seamless local connection
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "service": "SentinelAI Banking Fraud Detection API",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_STR}/system/health"
    }

@app.get("/health")
def health():
    return {"status": "HEALTHY", "version": settings.VERSION}
