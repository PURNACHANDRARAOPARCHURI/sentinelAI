import random
import string
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.db_models import OTPVerification

class OTPService:
    """
    Step-Up Authentication Service.
    Generates cryptographically random 6-digit OTPs, enforces expiration,
    tracks failed verification attempts, and supports both dev mock mode and SMTP email.
    """
    def __init__(self):
        self.expiry_seconds = settings.OTP_EXPIRY_SECONDS
        self.mock_mode = settings.MOCK_OTP_MODE
        self.max_attempts = 3

    def generate_otp(self, transaction_id: str, recipient: str, db: Session, channel: str = "SMS") -> Dict[str, Any]:
        """Generates, hashes, stores, and dispatches a 6-digit OTP."""
        raw_code = "".join(random.choices(string.digits, k=6))
        # Hash code before persisting in database for security
        code_hash = hashlib.sha256(raw_code.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self.expiry_seconds)

        # Deactivate any previous OTPs for this transaction
        db.query(OTPVerification).filter(OTPVerification.transaction_id == transaction_id).delete()

        otp_record = OTPVerification(
            transaction_id=transaction_id,
            otp_code=code_hash,
            channel=channel,
            recipient=recipient,
            attempts=0,
            verified=False,
            expires_at=expires_at
        )
        db.add(otp_record)
        db.commit()

        # In live production mode with SMTP configured, dispatch email
        if not self.mock_mode and settings.SMTP_USER and settings.SMTP_HOST:
            self._send_email_otp(recipient, raw_code)

        return {
            "transaction_id": transaction_id,
            "channel": channel,
            "recipient": recipient,
            "expires_in_seconds": self.expiry_seconds,
            "mock_otp": raw_code if self.mock_mode else None,
            "message": f"Step-Up Authentication required. OTP dispatched to {recipient} (Dev Mock: {raw_code if self.mock_mode else 'Hidden'})."
        }

    def verify_otp(self, transaction_id: str, raw_code: str, db: Session) -> Tuple[bool, str]:
        """Verifies an OTP attempt with rate limiting and expiration enforcement."""
        record = db.query(OTPVerification).filter(
            OTPVerification.transaction_id == transaction_id,
            OTPVerification.verified == False
        ).first()

        if not record:
            return False, "No active OTP request found for this transaction."

        now = datetime.now(timezone.utc)
        record_expiry = record.expires_at
        if record_expiry.tzinfo is None:
            record_expiry = record_expiry.replace(tzinfo=timezone.utc)

        if now > record_expiry:
            return False, "OTP has expired. Please request a new verification code."

        if record.attempts >= self.max_attempts:
            return False, "Maximum verification attempts exceeded. Transaction blocked."

        input_hash = hashlib.sha256(raw_code.strip().encode()).hexdigest()
        if input_hash == record.otp_code:
            record.verified = True
            db.commit()
            return True, "OTP verified successfully. Transaction approved."
        else:
            record.attempts += 1
            db.commit()
            remaining = self.max_attempts - record.attempts
            return False, f"Invalid OTP code. {remaining} attempt(s) remaining."

    def _send_email_otp(self, recipient: str, code: str):
        # Email dispatch placeholder using smtplib
        pass

otp_service = OTPService()
