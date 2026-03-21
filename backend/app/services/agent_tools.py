"""
Server-side tools for the SafeWander assistant.

Gemini reads each function’s **name**, **docstring**, and **type hints** to build
the tool schema. Add new tools here and append them to `SAFEWANDER_TOOLS`.
"""

from __future__ import annotations

# --- Safety & places ---------------------------------------------------------


def get_safety_score(
    latitude: float = 37.7749,
    longitude: float = -122.4194,
) -> dict:
    """Return a demo safety score (0-100) for coordinates. If the user does not give a location, defaults to a San Francisco demo point so you can still answer."""
    score = 72 + (hash((round(latitude, 3), round(longitude, 3))) % 20)
    score = max(0, min(100, score))
    label = (
        "Very safe"
        if score >= 80
        else "Safe"
        if score >= 60
        else "OK"
        if score >= 40
        else "Not safe"
    )
    return {"score": score, "label": label, "latitude": latitude, "longitude": longitude}


def find_nearby_safe_places(
    place_type: str,
    latitude: float = 37.7749,
    longitude: float = -122.4194,
) -> dict:
    """Find nearby safe places. place_type is one of: police, hospital, public_space. Optional coordinates default to a demo location if missing."""
    pt = place_type.lower().strip()
    if pt == "police":
        return {
            "places": [
                {"name": "Central Police Station (demo)", "distance_m": 350, "open_24h": False}
            ]
        }
    if pt == "hospital":
        return {"places": [{"name": "City General Hospital (demo)", "distance_m": 520}]}
    return {
        "places": [
            {"name": "24/7 Transit Hub (demo)", "distance_m": 180, "type": "public_space"}
        ]
    }


def trigger_sos_ping(message: str = "User requested help") -> dict:
    """Record an SOS intent (demo). In production: notify trusted contacts + share live location."""
    return {"status": "queued", "message": message, "trusted_contacts_notified": 0}


# --- Travel helpers ----------------------------------------------------------


def get_emergency_checklist(situation: str) -> dict:
    """
    Return a short emergency checklist tailored to a situation keyword
    (e.g. lost, medical, harassment, natural_disaster).
    """
    s = situation.lower()
    if "medical" in s or "hurt" in s:
        return {
            "situation": situation,
            "steps": [
                "Call local emergency number (112/911/999 depending on country).",
                "Stay visible; ask a shop or official for help if needed.",
                "Share live location with a trusted contact when safe.",
            ],
        }
    if "lost" in s or "direction" in s:
        return {
            "situation": situation,
            "steps": [
                "Move to a well-lit public place (café, station, hotel lobby).",
                "Use offline maps; confirm address with staff before walking.",
                "Message someone your planned route and ETA.",
            ],
        }
    if "harass" in s or "follow" in s:
        return {
            "situation": situation,
            "steps": [
                "Enter a busy venue; tell staff you need help.",
                "Call police or emergency line; describe clothing/behavior.",
                "Do not isolate—stay around people until you feel safe.",
            ],
        }
    return {
        "situation": situation,
        "steps": [
            "Pause and breathe; move to a safer public area.",
            "Contact local emergency services if there is danger.",
            "Tell a trusted contact where you are and what you need.",
        ],
    }


def get_local_emergency_number(region_code: str) -> dict:
    """
    Return a demo primary emergency phone number for an ISO-like region code
    (e.g. US, GB, DE, IN). Not authoritative—verify locally when traveling.
    """
    rc = region_code.upper().strip()
    demo = {
        "US": "911",
        "GB": "999",
        "DE": "112",
        "FR": "112",
        "IN": "112",
        "JP": "110/119",
        "AU": "000",
    }
    number = demo.get(rc, "112 (EU default — verify for your country)")
    return {"region_code": rc, "number": number, "note": "Demo data; confirm before relying on it."}


# Registry used by `gemini_chat` — add new callables here.
SAFEWANDER_TOOLS: list = [
    get_safety_score,
    find_nearby_safe_places,
    trigger_sos_ping,
    get_emergency_checklist,
    get_local_emergency_number,
]
