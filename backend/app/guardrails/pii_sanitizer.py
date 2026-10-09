import re
from typing import Dict, Any, Union

class PIISanitizer:
    """
    Personally Identifiable Information (PII) Detection and Anonymization.
    Complies with Presidio / Banking Data Minimization rules (RBI & GDPR).
    Masks Account Numbers, Card PANs, Aadhaar, Indian PAN IDs, and phone numbers.
    """
    def __init__(self):
        # 16-digit card numbers
        self.card_pattern = re.compile(r'\b(?:\d[ -]*?){13,16}\b')
        # Indian PAN: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
        self.pan_pattern = re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', re.IGNORECASE)
        # Indian Aadhaar: 12 digits
        self.aadhaar_pattern = re.compile(r'\b\d{4}\s?\d{4}\s?\d{4}\b')
        # Email addresses
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        # Phone numbers
        self.phone_pattern = re.compile(r'\b(?:\+91|0)?[6-9]\d{9}\b')

    def mask_account_number(self, account: str) -> str:
        """Masks account number preserving prefix and last 4 digits."""
        if not account or len(account) < 6:
            return account
        return f"{account[:2]}****{account[-4:]}"

    def sanitize_text(self, text: str) -> str:
        """Sanitizes unstructured text narratives, removing sensitive PII."""
        if not text:
            return text
            
        # Mask emails
        text = self.email_pattern.sub("[EMAIL_MASKED]", text)
        # Mask phone numbers
        text = self.phone_pattern.sub("[PHONE_MASKED]", text)
        # Mask Aadhaar
        text = self.aadhaar_pattern.sub("[AADHAAR_MASKED]", text)
        # Mask PAN
        text = self.pan_pattern.sub("[PAN_MASKED]", text)
        # Mask Card Numbers
        text = self.card_pattern.sub("[CARD_MASKED]", text)
        
        return text

    def sanitize_transaction(self, tx_data: Dict[str, Any]) -> Dict[str, Any]:
        """Returns a copy of transaction with PII masked for audit logs."""
        clean = dict(tx_data)
        if "sender_account" in clean:
            clean["sender_account"] = self.mask_account_number(str(clean["sender_account"]))
        if "receiver_account" in clean:
            clean["receiver_account"] = self.mask_account_number(str(clean["receiver_account"]))
        if "description" in clean and clean["description"]:
            clean["description"] = self.sanitize_text(str(clean["description"]))
        return clean

pii_sanitizer = PIISanitizer()
