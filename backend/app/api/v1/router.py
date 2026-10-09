from fastapi import APIRouter

from backend.app.api.v1.endpoints import (
    auth,
    transactions,
    investigations,
    dashboard,
    analytics,
    models_perf,
    system
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & RBAC"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions & Real-Time Scoring"])
api_router.include_router(investigations.router, prefix="/investigations", tags=["Human Review & Investigations"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard & Metrics"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Risk Analytics"])
api_router.include_router(models_perf.router, prefix="/models", tags=["Model Performance"])
api_router.include_router(system.router, prefix="/system", tags=["System Health & Settings"])
