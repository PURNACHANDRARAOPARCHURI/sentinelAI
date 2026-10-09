# Internal Banking Fraud Risk Policy & Typologies
## Document Ref: POL-FRAUD-SEC-2026-V3

### 1. Account Depletion Anomaly Rule (AD-01)
- **Condition:** Outgoing transaction amount constitutes >= 90% of the account's existing ledger balance, leaving less than 5% or zero balance, especially via non-reversible rail (TRANSFER, WIRE, RTGS, CRYPTO CASHOUT).
- **Risk Level:** CRITICAL (Score Contribution: +0.40)
- **Policy Action:** Immediate hold or escalation to multi-agent fraud investigation.

### 2. Off-Hours High Velocity Rule (OH-02)
- **Condition:** Transaction initiated between 23:00 and 05:00 local time, exceeding standard daily limit or 3x the 30-day average transaction amount.
- **Risk Level:** HIGH (Score Contribution: +0.25)
- **Policy Action:** Step-Up Authentication (MFA/OTP) required before ledger debit.

### 3. New Payee / Unverified Destination Rule (NP-03)
- **Condition:** Destination account has zero prior relationship history with sender, was added within last 24 hours, and initial transfer amount exceeds ₹50,000.
- **Risk Level:** MEDIUM-HIGH (Score Contribution: +0.20)
- **Policy Action:** SMS/Email alert to sender with 30-minute cooling period or mandatory OTP step-up.

### 4. Device Mismatch & Impossible Velocity (DM-04)
- **Condition:** Transaction initiated from a newly registered device ID or geographical location > 500 km away from last authenticated session within 1 hour.
- **Risk Level:** CRITICAL (Score Contribution: +0.35)
- **Policy Action:** Halt automated approval; dispatch case to Tier 2 Human Review analyst.
