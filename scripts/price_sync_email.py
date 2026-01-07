#!/usr/bin/env python3
"""
Email the price sync status using Gmail SMTP.
Requires EMAIL_USER, EMAIL_PASS, EMAIL_TO in .env.
"""

import os
import sys
import smtplib
from email.message import EmailMessage
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv


def load_env():
    repo_root = Path(__file__).parent.parent
    load_dotenv(repo_root / ".env")


def build_message(status: dict, sender: str, recipient: str) -> EmailMessage:
    subject_state = "ACTION NEEDED" if status.get("needs_sync") else "NO ACTION"
    subject = f"[Ohmni Bid] Pricing Monitor - {subject_state}"

    body_lines = [
        "OHMNI BID PRICING MONITOR",
        "==========================",
        "",
        f"Summary: {status.get('message')}",
        "",
        "Key Signals (What these mean)",
        f"- Pricing stale (Excel changed since last sync): {'YES' if status.get('excel_changed') else 'No'}",
        (
            "- PM updated Excel since last check: "
            f"{'YES' if status.get('excel_changed_since_last_check') else 'No'}"
        ),
        "",
        "Timestamps",
        f"- Checked at: {format_timestamp(status.get('checked_at'))}",
        f"- Excel modified: {format_timestamp(status.get('excel_modified'))}",
        f"- JSON modified: {format_timestamp(status.get('json_modified'))}",
        "",
        "History file: data/sync_history.json",
    ]

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.set_content("\n".join(body_lines))
    return msg


def send_email(message: EmailMessage, sender: str, password: str):
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender, password)
        server.send_message(message)


def format_timestamp(value: str) -> str:
    if not value:
        return "Unknown"
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return value
    return dt.strftime("%B {day}, %Y at %I:%M %p").format(day=ordinal(dt.day))


def ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def main():
    load_env()

    sender = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASS")
    recipient = os.getenv("EMAIL_TO")

    missing = [k for k, v in {
        "EMAIL_USER": sender,
        "EMAIL_PASS": password,
        "EMAIL_TO": recipient
    }.items() if not v]
    if missing:
        print(f"Missing required env vars: {', '.join(missing)}")
        sys.exit(1)

    # Import from sibling script
    sys.path.append(str(Path(__file__).parent))
    from price_sync_monitor import check_sync_status

    status = check_sync_status()
    message = build_message(status, sender, recipient)
    send_email(message, sender, password)
    print("Email sent.")


if __name__ == "__main__":
    main()
