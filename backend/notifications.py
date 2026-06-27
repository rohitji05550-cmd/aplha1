"""Notifications — WhatsApp (Meta Cloud API) + Email (Resend).

Both providers have FREE tiers and require zero credit card.

ENV needed (in /app/backend/.env):
  RESEND_API_KEY            — get from https://resend.com  (free 3,000/mo)
  RESEND_FROM_EMAIL         — verified sender, e.g. onboarding@resend.dev (works without domain)
  NOTIFY_ADMIN_EMAIL        — your inbox to receive lead alerts
  META_WA_TOKEN             — permanent access token from Meta App
  META_WA_PHONE_NUMBER_ID   — your WhatsApp Business test/prod number id
  META_WA_VERIFY_TOKEN      — random string YOU pick, also paste in Meta webhook UI
  ADMIN_NOTIFY_WHATSAPP     — admin WhatsApp number (E.164, no +)
"""
from __future__ import annotations
import os
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel, EmailStr
import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
NOTIFY_ADMIN_EMAIL = os.environ.get("NOTIFY_ADMIN_EMAIL", "")

META_WA_TOKEN = os.environ.get("META_WA_TOKEN", "")
META_WA_PHONE_ID = os.environ.get("META_WA_PHONE_NUMBER_ID", "")
META_WA_VERIFY_TOKEN = os.environ.get("META_WA_VERIFY_TOKEN", "ssu-wa-verify")
ADMIN_NOTIFY_WHATSAPP = os.environ.get("ADMIN_NOTIFY_WHATSAPP", "")

router = APIRouter(prefix="/api/notify", tags=["notify"])


# ---------------------------------------------------------------- email (Resend)
class EmailPayload(BaseModel):
    to: EmailStr
    subject: str
    html: str
    cc: Optional[str] = None


async def _send_resend_email(to: str, subject: str, html: str, cc: Optional[str] = None) -> Dict[str, Any]:
    if not RESEND_API_KEY:
        return {"ok": False, "skipped": True, "reason": "RESEND_API_KEY not configured"}
    payload: Dict[str, Any] = {
        "from": RESEND_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if cc:
        payload["cc"] = [cc]
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            logger.warning("Resend send failed %s: %s", r.status_code, r.text)
            return {"ok": False, "status": r.status_code, "error": r.text}
        return {"ok": True, "id": r.json().get("id")}


@router.post("/email")
async def send_email(body: EmailPayload):
    res = await _send_resend_email(body.to, body.subject, body.html, body.cc)
    if not res.get("ok") and not res.get("skipped"):
        raise HTTPException(502, res.get("error") or "Email send failed")
    return res


# ---------------------------------------------------------- WhatsApp (Meta Cloud)
class WAPayload(BaseModel):
    to: str               # E.164 without + e.g. "919812345678"
    text: Optional[str] = None
    template: Optional[str] = None  # e.g. "hello_world"
    language_code: Optional[str] = "en"


async def _send_wa(to: str, text: Optional[str] = None, template: Optional[str] = None, language_code: str = "en") -> Dict[str, Any]:
    if not (META_WA_TOKEN and META_WA_PHONE_ID):
        return {"ok": False, "skipped": True, "reason": "Meta WhatsApp not configured"}

    url = f"https://graph.facebook.com/v20.0/{META_WA_PHONE_ID}/messages"
    headers = {"Authorization": f"Bearer {META_WA_TOKEN}", "Content-Type": "application/json"}
    body: Dict[str, Any]
    if template:
        body = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {"name": template, "language": {"code": language_code}},
        }
    else:
        # Free-form text only works inside the 24h customer service window.
        body = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": (text or "Hello from SmartSetupUAE")[:4096]},
        }
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(url, headers=headers, json=body)
        if r.status_code >= 400:
            logger.warning("WA send failed %s: %s", r.status_code, r.text)
            return {"ok": False, "status": r.status_code, "error": r.text}
        return {"ok": True, "data": r.json()}


@router.post("/whatsapp")
async def send_whatsapp(payload: WAPayload):
    res = await _send_wa(payload.to, payload.text, payload.template, payload.language_code or "en")
    if not res.get("ok") and not res.get("skipped"):
        raise HTTPException(502, res.get("error") or "WhatsApp send failed")
    return res


# -------- Webhook for Meta WhatsApp (Meta will GET to verify, POST for messages)
@router.get("/whatsapp/webhook")
async def wa_verify(request: Request):
    params = request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == META_WA_VERIFY_TOKEN:
        challenge = params.get("hub.challenge", "")
        return PlainTextResponse(challenge)
    raise HTTPException(403, "verify token mismatch")


@router.post("/whatsapp/webhook")
async def wa_webhook(request: Request):
    body = await request.json()
    logger.info("WA inbound: %s", str(body)[:600])
    # Stub: in future, route to Aria for AI auto-reply. For now just ack.
    return JSONResponse({"ok": True})


# ---------------------------------------------- helper used by lead/order modules
class LeadAlert(BaseModel):
    lead_name: str
    lead_phone: str
    lead_email: Optional[str] = ""
    source: Optional[str] = "website"
    summary: Optional[str] = ""


@router.post("/lead-alert")
async def lead_alert(payload: LeadAlert):
    """Notify admin via email + WhatsApp when a new lead arrives."""
    email_html = f"""
    <div style="font-family:Inter,system-ui,Arial,sans-serif;background:#fbfaf6;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 12px;color:#0f766e">🚀 New SmartSetupUAE lead</h2>
      <table style="border-collapse:collapse;width:100%;max-width:520px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="padding:10px 14px;font-weight:600">Name</td><td style="padding:10px 14px">{payload.lead_name}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:600;background:#f8fafc">Phone</td><td style="padding:10px 14px;background:#f8fafc">{payload.lead_phone}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:600">Email</td><td style="padding:10px 14px">{payload.lead_email or '—'}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:600;background:#f8fafc">Source</td><td style="padding:10px 14px;background:#f8fafc">{payload.source}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:600">Summary</td><td style="padding:10px 14px">{payload.summary or '—'}</td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#64748b">SmartSetupUAE · Axiscrest-Global FZE LLC</p>
    </div>
    """
    out: Dict[str, Any] = {}
    if NOTIFY_ADMIN_EMAIL:
        out["email"] = await _send_resend_email(NOTIFY_ADMIN_EMAIL, f"New lead: {payload.lead_name}", email_html)
    if ADMIN_NOTIFY_WHATSAPP:
        wa_text = f"New SmartSetupUAE lead\nName: {payload.lead_name}\nPhone: {payload.lead_phone}\nEmail: {payload.lead_email or '-'}\nSource: {payload.source}\n{payload.summary or ''}"
        out["whatsapp"] = await _send_wa(ADMIN_NOTIFY_WHATSAPP, wa_text)
    return {"ok": True, **out}
