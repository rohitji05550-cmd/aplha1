"""Support tickets — Aria-first, live-agent-second.

Flow:
  1. Customer raises a ticket from Aria chatbot, dashboard, or any page.
  2. Aria attempts an instant AI reply (saved as first message in the thread).
  3. Ticket appears in admin panel for all staff. Whoever clicks "Claim"
     becomes the assigned agent. SLA timer (30 min) starts ticking.
  4. Agent + customer exchange messages until status is set to "resolved".

Endpoints:
  POST   /api/support/tickets                 → create ticket (open + Aria first-reply)
  GET    /api/support/tickets                 → admin list (filter by status, mine)
  GET    /api/support/tickets/{id}            → one ticket + messages
  POST   /api/support/tickets/{id}/messages   → add a reply
  POST   /api/support/tickets/{id}/claim      → assign to caller
  PATCH  /api/support/tickets/{id}            → update status / priority
  GET    /api/support/tickets/by-user/{email} → customer-visible list
"""
from __future__ import annotations
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

router = APIRouter(prefix="/api/support", tags=["support"])

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    _mongo = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    _db = _mongo[os.environ.get("DB_NAME", "smartsetupuae")]
    _tickets = _db["support_tickets"]
    _messages = _db["support_messages"]
except Exception as _exc:
    _tickets = _messages = None
    logger.warning("Support tickets disabled — Mongo not available: %s", _exc)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _resolve_caller_role(authorization: Optional[str]) -> Dict[str, str]:
    """Return {id, email, role} for the JWT, or anon for unauth callers."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"id": "", "email": "", "role": "anon"}
    token = authorization.split(" ", 1)[1]
    try:
        async with httpx.AsyncClient(timeout=8) as cli:
            r = await cli.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {token}"},
            )
            if r.status_code != 200:
                return {"id": "", "email": "", "role": "anon"}
            u = r.json() or {}
            uid, email = u.get("id", ""), u.get("email", "")
            # role lookup
            rp = await cli.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                params={"select": "role", "id": f"eq.{uid}"},
                headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
            )
            rows = rp.json() if rp.status_code == 200 else []
            role = (rows[0].get("role") if rows else "client").lower()
            return {"id": uid, "email": email, "role": role}
    except Exception:
        return {"id": "", "email": "", "role": "anon"}


def _is_staff(role: str) -> bool:
    return role in ("admin", "manager", "staff", "reviewer", "founder")


# ----------  Aria first-reply (best-effort) ----------
async def _aria_first_reply(subject: str, message: str) -> str:
    """Quick AI acknowledgement so the customer hears something instantly."""
    if not EMERGENT_LLM_KEY:
        return ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ticket-{uuid.uuid4().hex[:8]}",
            system_message=(
                "You are Aria, SmartSetupUAE's AI concierge. A customer has opened a support ticket. "
                "Reply in 2–4 short sentences: (1) acknowledge politely, (2) give an immediate helpful "
                "answer if you can (UAE business setup, freezone, visa, VAT, banking) using the public "
                "information from smartsetupuae.ae, (3) tell them a human advisor will reach them on "
                "WhatsApp +971 58 590 3155 within 30 minutes. Sign off as 'Aria'."
            ),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        out = await chat.send_message(UserMessage(text=f"Subject: {subject}\n\nMessage: {message}"))
        return (out or "").strip()
    except Exception as exc:
        logger.warning("Aria first-reply failed: %s", exc)
        return ""


# ----------  Models ----------
class TicketIn(BaseModel):
    subject: str
    message: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    channel: Optional[str] = "web"   # web | aria | whatsapp | email
    priority: Optional[str] = "normal"  # low | normal | high | urgent
    related_url: Optional[str] = None


class MessageIn(BaseModel):
    body: str


class TicketPatch(BaseModel):
    status: Optional[str] = None        # open | in_progress | resolved | closed
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    internal_note: Optional[str] = None


# ----------  Endpoints ----------
@router.post("/tickets")
async def create_ticket(body: TicketIn, authorization: Optional[str] = Header(default=None)):
    if _tickets is None:
        raise HTTPException(500, "Tickets backend not available.")
    caller = await _resolve_caller_role(authorization)
    tid = uuid.uuid4().hex[:12].upper()
    ref = f"SST-{tid[:8]}"
    now = _now()
    doc = {
        "_id": tid,
        "reference": ref,
        "subject": body.subject[:200],
        "channel": body.channel or "web",
        "priority": body.priority or "normal",
        "status": "open",
        "customer_email": (body.customer_email or caller.get("email") or "").lower(),
        "customer_name": body.customer_name or "",
        "phone": body.phone or "",
        "related_url": body.related_url or "",
        "assigned_to": "",
        "created_at": now,
        "updated_at": now,
        "first_response_at": "",
        "resolved_at": "",
        "sla_minutes": 30,
    }
    await _tickets.insert_one(doc)
    # First customer message
    await _messages.insert_one({
        "ticket_id": tid,
        "from_role": "customer",
        "from_email": doc["customer_email"],
        "body": body.message[:4000],
        "created_at": now,
    })
    # Aria instant reply
    aria = await _aria_first_reply(body.subject, body.message)
    if aria:
        await _messages.insert_one({
            "ticket_id": tid,
            "from_role": "aria",
            "from_email": "aria@smartsetupuae.ae",
            "body": aria[:4000],
            "created_at": _now(),
        })
        await _tickets.update_one({"_id": tid}, {"$set": {"first_response_at": _now()}})

    fresh = await _tickets.find_one({"_id": tid})
    return {"ok": True, "ticket": fresh}


@router.get("/tickets")
async def list_tickets(
    status: Optional[str] = None,
    mine: Optional[bool] = False,
    authorization: Optional[str] = Header(default=None),
):
    if _tickets is None:
        raise HTTPException(500, "Tickets backend not available.")
    caller = await _resolve_caller_role(authorization)
    if not _is_staff(caller["role"]):
        raise HTTPException(403, "Staff role required")
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    if mine and caller.get("email"):
        q["assigned_to"] = caller["email"].lower()
    cursor = _tickets.find(q).sort("created_at", -1).limit(200)
    rows = [doc async for doc in cursor]
    return rows


@router.get("/tickets/{tid}")
async def one_ticket(tid: str, authorization: Optional[str] = Header(default=None)):
    if _tickets is None:
        raise HTTPException(500, "Tickets backend not available.")
    caller = await _resolve_caller_role(authorization)
    t = await _tickets.find_one({"_id": tid})
    if not t:
        raise HTTPException(404, "Ticket not found")
    # Customer can only see their own; staff can see any.
    if not _is_staff(caller["role"]) and t.get("customer_email", "").lower() != caller.get("email", "").lower():
        raise HTTPException(403, "Not your ticket")
    msgs = []
    async for m in _messages.find({"ticket_id": tid}).sort("created_at", 1):
        m.pop("_id", None)
        msgs.append(m)
    return {"ticket": t, "messages": msgs}


@router.post("/tickets/{tid}/messages")
async def add_message(tid: str, body: MessageIn, authorization: Optional[str] = Header(default=None)):
    if _tickets is None:
        raise HTTPException(500, "Tickets backend not available.")
    caller = await _resolve_caller_role(authorization)
    t = await _tickets.find_one({"_id": tid})
    if not t:
        raise HTTPException(404, "Ticket not found")
    is_staff = _is_staff(caller["role"])
    is_owner = t.get("customer_email", "").lower() == caller.get("email", "").lower()
    if not is_staff and not is_owner:
        raise HTTPException(403, "Not allowed")
    msg = {
        "ticket_id": tid,
        "from_role": "agent" if is_staff else "customer",
        "from_email": caller.get("email", "anonymous"),
        "body": body.body[:4000],
        "created_at": _now(),
    }
    await _messages.insert_one(msg)
    msg.pop("_id", None)
    update: Dict[str, Any] = {"updated_at": _now()}
    if is_staff and not t.get("first_response_at"):
        update["first_response_at"] = _now()
    if is_staff and t.get("status") == "open":
        update["status"] = "in_progress"
    await _tickets.update_one({"_id": tid}, {"$set": update})
    return {"ok": True, "message": msg}


@router.post("/tickets/{tid}/claim")
async def claim_ticket(tid: str, authorization: Optional[str] = Header(default=None)):
    if _tickets is None:
        raise HTTPException(500, "Tickets backend not available.")
    caller = await _resolve_caller_role(authorization)
    if not _is_staff(caller["role"]):
        raise HTTPException(403, "Staff role required")
    t = await _tickets.find_one({"_id": tid})
    if not t:
        raise HTTPException(404, "Ticket not found")
    if t.get("assigned_to") and t["assigned_to"] != caller["email"]:
        raise HTTPException(409, f"Already assigned to {t['assigned_to']}")
    await _tickets.update_one({"_id": tid}, {"$set": {
        "assigned_to": caller["email"].lower(),
        "status": "in_progress" if t.get("status") == "open" else t.get("status"),
        "updated_at": _now(),
    }})
    fresh = await _tickets.find_one({"_id": tid})
    return {"ok": True, "ticket": fresh}


@router.patch("/tickets/{tid}")
async def patch_ticket(tid: str, body: TicketPatch, authorization: Optional[str] = Header(default=None)):
    if _tickets is None:
        raise HTTPException(500, "Tickets backend not available.")
    caller = await _resolve_caller_role(authorization)
    if not _is_staff(caller["role"]):
        raise HTTPException(403, "Staff role required")
    payload: Dict[str, Any] = {"updated_at": _now()}
    if body.status:
        payload["status"] = body.status
        if body.status in ("resolved", "closed"):
            payload["resolved_at"] = _now()
    if body.priority:
        payload["priority"] = body.priority
    if body.assigned_to is not None:
        payload["assigned_to"] = body.assigned_to.lower()
    if body.internal_note:
        await _messages.insert_one({
            "ticket_id": tid,
            "from_role": "internal",
            "from_email": caller.get("email", ""),
            "body": body.internal_note[:4000],
            "created_at": _now(),
        })
    await _tickets.update_one({"_id": tid}, {"$set": payload})
    fresh = await _tickets.find_one({"_id": tid})
    return {"ok": True, "ticket": fresh}


@router.get("/tickets/by-user/{email}")
async def list_for_user(email: str, authorization: Optional[str] = Header(default=None)):
    if _tickets is None:
        raise HTTPException(500, "Tickets backend not available.")
    caller = await _resolve_caller_role(authorization)
    if not (_is_staff(caller["role"]) or caller.get("email", "").lower() == email.lower()):
        raise HTTPException(403, "Not allowed")
    cursor = _tickets.find({"customer_email": email.lower()}).sort("created_at", -1).limit(50)
    rows = [doc async for doc in cursor]
    return rows
