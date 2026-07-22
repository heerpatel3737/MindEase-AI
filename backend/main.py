import os
import json
from datetime import datetime, timedelta
from typing import List, Optional, Callable, Iterator
from fastapi import FastAPI, Depends, HTTPException, status, Body, UploadFile, File, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

# Database, Auth, Models & Schemas
import models
import schemas
import auth
from database import engine, Base, get_db
from ai_service import AIService
from ai.emotion import compute_emotional_state
from ai.memory import (
    upsert_memory,
    retrieve_relevant_memories,
    memory_content_from_conversation,
    memory_content_from_journal,
)
from ai.sse import format_sse
from ai.safety import check_safety
from ai.voice import VoiceService

# Auto-create SQLite / PostgreSQL tables on startup
# This acts as our zero-config migration tool!
def seed_default_user(db: Session) -> None:
    """Ensure the demo account always exists and uses the advertised password."""
    demo = db.query(models.User).filter(models.User.username == "demo").first()
    if demo:
        if not auth.verify_password("demo123", demo.password_hash):
            demo.password_hash = auth.get_password_hash("demo123")
            demo.active_personality = demo.active_personality or "Calm Therapist"
            db.commit()
            print("DATABASE: Demo user password repaired (username: demo, password: demo123).")
        return

    demo_user = models.User(
        username="demo",
        password_hash=auth.get_password_hash("demo123"),
        active_personality="Calm Therapist",
    )
    db.add(demo_user)
    db.commit()
    print("DATABASE: Default demo user created (username: demo, password: demo123).")


try:
    Base.metadata.create_all(bind=engine)
    print("DATABASE: Schema tables verified/created successfully.")
    with next(get_db()) as db:
        seed_default_user(db)
except Exception as e:
    print(f"DATABASE ERROR: Schema creation failed. Error: {e}")

# Initialize FastAPI App
app = FastAPI(
    title="MindEase AI API",
    description="Cognitive Operating System and Emotional Companion REST backend",
    version="1.0.0"
)

ALLOWED_PERSONAS = [
    "Calm Therapist",
    "Best Friend",
    "Logical Analyst",
    "Decision Coach",
    "Confidence Builder",
    "Productivity Mentor",
    "Tough Love Coach",
    "Social Coach",
    "Career Mentor",
    "Adaptive Companion",
]

PERSONA_ALIASES = {
    "Smart Best Friend": "Best Friend",
    "Productivity Coach": "Productivity Mentor",
    "Motivational Mentor": "Confidence Builder",
    "Minimal Assistant": "Decision Coach",
    "Analytical Advisor": "Logical Analyst",
    "Compassionate Listener": "Calm Therapist",
    "Pragmatic Advisor": "Decision Coach",
    "Emotional Nurturer": "Confidence Builder",
}

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# Enable CORS for Next.js frontend running locally and on Vercel deployment domains (*.vercel.app).
raw_origins = os.getenv("CORS_ORIGINS", "").split(",")
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://mindease-ai-yezs.vercel.app",
]
cors_origins = list(dict.fromkeys([o.strip() for o in raw_origins + default_origins if o.strip() and o.strip() != "*"]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Service
ai_service = AIService()
voice_service = VoiceService()
_login_attempts: dict[str, list[datetime]] = {}


def _rate_limit_auth(key: str, max_attempts: int = 8, window_minutes: int = 10) -> None:
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=window_minutes)
    attempts = [ts for ts in _login_attempts.get(key, []) if ts > window_start]
    if len(attempts) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait a few minutes and try again.",
        )
    attempts.append(now)
    _login_attempts[key] = attempts


def _normalize_persona(personality: str) -> str:
    return PERSONA_ALIASES.get(personality, personality)


def _ensure_preferences(db: Session, user_id: int) -> models.UserPreference:
    prefs = db.query(models.UserPreference).filter(models.UserPreference.user_id == user_id).first()
    if prefs:
        return prefs
    prefs = models.UserPreference(user_id=user_id)
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    return prefs


def _preferences_payload(prefs: models.UserPreference) -> dict:
    def loads(raw: str | None) -> dict:
        try:
            return json.loads(raw or "{}")
        except json.JSONDecodeError:
            return {}

    return {
        "theme": prefs.theme,
        "active_tab": prefs.active_tab,
        "communication_style": prefs.communication_style,
        "dashboard_state": loads(prefs.dashboard_state_json),
        "settings": loads(prefs.settings_json),
    }


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=(self)"
    return response


@app.on_event("startup")
def startup_diagnostics():
    print("=========================================", flush=True)
    print("          STARTUP DIAGNOSTICS", flush=True)
    print("=========================================", flush=True)
    
    # 1. Database Health
    db_ok = False
    try:
        from sqlalchemy import text
        from database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception as e:
        print(f"DATABASE DIAGNOSTIC ERROR: {e}", flush=True)
        
    print(f"Database: {'Connected' if db_ok else 'Failed'}", flush=True)
    
    # 2. Gemini & Groq Health
    gemini_ok = False
    groq_ok = False
    try:
        gemini_ok = ai_service.client.check_provider_health("gemini")
    except Exception as e:
        print(f"GEMINI DIAGNOSTIC ERROR: {e}", flush=True)
        
    try:
        groq_ok = ai_service.client.check_provider_health("groq")
    except Exception as e:
        print(f"GROQ DIAGNOSTIC ERROR: {e}", flush=True)
        
    print(f"Gemini: {'Connected' if gemini_ok else 'Failed'}", flush=True)
    print(f"Groq: {'Connected' if groq_ok else 'Failed'}", flush=True)
    
    # 3. Auth Health
    auth_ok = False
    try:
        import auth
        hash_val = auth.get_password_hash("healthcheck")
        if auth.verify_password("healthcheck", hash_val):
            auth_ok = True
    except Exception as e:
        print(f"AUTH DIAGNOSTIC ERROR: {e}", flush=True)
        
    print(f"Auth: {'Connected' if auth_ok else 'Failed'}", flush=True)
    print("=========================================", flush=True)


@app.get("/ping", tags=["Health"])
def ping():
    """Health check endpoint to keep Render instance active."""
    return {"status": "ok"}


# ==========================================
#              AUTH ENDPOINTS
# ==========================================

@app.post("/api/auth/register", response_model=schemas.UserResponse, tags=["Auth"])
def register_user(user_data: schemas.UserAuth, db: Session = Depends(get_db)):
    """Registers a new user, hashes their password, and saves them to the DB."""
    username = user_data.username.strip()
    if "@" not in username and len(username) < 3:
        raise HTTPException(status_code=400, detail="Invalid email or username.")
    # Check if username already exists
    existing_user = db.query(models.User).filter(models.User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists."
        )
    
    # Enforce password rules
    auth.validate_password_strength(user_data.password)
        
    hashed_pwd = auth.get_password_hash(user_data.password)
    new_user = models.User(
        username=username,
        password_hash=hashed_pwd,
        active_personality="Calm Therapist"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    _ensure_preferences(db, new_user.id)
    return new_user


@app.post("/api/auth/login", tags=["Auth"])
def login_user(user_data: schemas.LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """Verifies user credentials and returns a secure JWT access token. Optionally sets a refresh cookie when `remember` is true."""
    username = user_data.username.strip()
    password = user_data.password.strip()
    remember = bool(getattr(user_data, "remember", False))
    _rate_limit_auth(f"{request.client.host if request.client else 'unknown'}:{username}")
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if not auth.verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password."
        )

    access_token = auth.create_access_token(data={"sub": user.username})
    refresh_days = auth.REFRESH_TOKEN_EXPIRE_DAYS if remember else 1
    refresh_token = auth.create_refresh_token_for_user(db, user, days=refresh_days)
    response.set_cookie(
        "mindease_refresh",
        refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=refresh_days * 24 * 3600,
    )
    if _normalize_persona(user.active_personality) != user.active_personality:
        user.active_personality = _normalize_persona(user.active_personality)
        db.commit()
        db.refresh(user)
    _ensure_preferences(db, user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "active_personality": user.active_personality,
            "created_at": user.created_at
        }
    }


@app.get("/api/auth/me", response_model=schemas.UserResponse, tags=["Auth"])
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    """Returns details of the currently authenticated user session."""
    return current_user




@app.post("/api/auth/refresh", response_model=schemas.RefreshResponse, tags=["Auth"])
def refresh_session(request: Request, response: Response, db: Session = Depends(get_db)):
    """Refreshes an access token using the httpOnly refresh cookie."""
    refresh_token = request.cookies.get("mindease_refresh")
    user = auth.verify_refresh_token(db, refresh_token)
    if not user:
        response.delete_cookie("mindease_refresh")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired.")
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.id, "username": user.username, "active_personality": user.active_personality, "created_at": user.created_at}}


@app.post("/api/auth/logout", tags=["Auth"])
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Logs out the user by revoking any refresh token and clearing the cookie."""
    refresh_token = request.cookies.get("mindease_refresh")
    if refresh_token:
        auth.revoke_refresh_token(db, refresh_token)
    response.delete_cookie("mindease_refresh", secure=COOKIE_SECURE, samesite="lax")
    return {"detail": "Logged out"}


@app.post("/api/auth/check-username", tags=["Auth"])
def check_username(payload: schemas.UsernameCheck, db: Session = Depends(get_db)):
    """Checks if a username exists. Returns true if available, false if taken."""
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty.")
    user_exists = db.query(models.User).filter(models.User.username == username).first() is not None
    return {"available": not user_exists, "message": "Username is available." if not user_exists else "Username is already taken."}


@app.get("/api/auth/demo-status", tags=["Auth"])
def demo_status(db: Session = Depends(get_db)):
    """Checks if demo account is available for login."""
    demo_user = db.query(models.User).filter(models.User.username == "demo").first()
    if not demo_user:
        raise HTTPException(status_code=404, detail="Demo account not configured.")
    return {"available": True, "username": "demo", "message": "Demo account is ready."}


@app.post("/api/auth/password-reset/request", tags=["Auth"])
def request_password_reset(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    """Creates a short-lived password reset token. In production, send it by email."""
    import secrets

    user = db.query(models.User).filter(models.User.username == payload.username.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    token = secrets.token_urlsafe(48)
    db.add(
        models.PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(minutes=30),
        )
    )
    db.commit()
    response = {"detail": "Password reset instructions generated."}
    if os.getenv("ENVIRONMENT", "development").lower() != "production":
        response["reset_token"] = token
    return response


@app.post("/api/auth/password-reset/confirm", tags=["Auth"])
def confirm_password_reset(payload: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    reset = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.token == payload.token).first()
    if not reset or reset.used or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Session expired.")
    auth.validate_password_strength(payload.new_password)
    user = db.query(models.User).filter(models.User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.password_hash = auth.get_password_hash(payload.new_password)
    reset.used = True
    for rt in db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id, models.RefreshToken.revoked == False).all():
        rt.revoked = True
    db.commit()
    return {"detail": "Password updated. Please log in again."}


@app.get("/api/auth/health", tags=["Auth"])
def auth_health(db: Session = Depends(get_db)):
    """Performs comprehensive authentication diagnostics."""
    diagnostics = {}
    all_ok = True
    
    try:
        # Database connectivity
        user_count = db.query(models.User).count()
        demo_exists = db.query(models.User).filter(models.User.username == "demo").first() is not None
        diagnostics["database"] = {"status": "ok", "user_count": user_count, "demo_account_exists": demo_exists}
    except Exception as e:
        diagnostics["database"] = {"status": "failed", "error": str(e)}
        all_ok = False
    
    try:
        # JWT token signing
        token = auth.create_access_token({"sub": "healthcheck"})
        _ = auth.verify_password if hasattr(auth, 'verify_password') else True
        diagnostics["jwt"] = {"status": "ok", "algorithm": "HS256"}
    except Exception as e:
        diagnostics["jwt"] = {"status": "failed", "error": str(e)}
        all_ok = False
    
    try:
        # Password hashing
        test_hash = auth.get_password_hash("test")
        is_valid = auth.verify_password("test", test_hash)
        diagnostics["password_hashing"] = {"status": "ok" if is_valid else "failed"}
    except Exception as e:
        diagnostics["password_hashing"] = {"status": "failed", "error": str(e)}
        all_ok = False
    
    try:
        # Refresh token mechanism
        demo_user = db.query(models.User).filter(models.User.username == "demo").first()
        if demo_user:
            refresh_token = auth.create_refresh_token_for_user(db, demo_user, days=1)
            verified_user = auth.verify_refresh_token(db, refresh_token)
            is_working = verified_user is not None
            diagnostics["refresh_tokens"] = {"status": "ok" if is_working else "failed"}
        else:
            diagnostics["refresh_tokens"] = {"status": "warning", "message": "Demo user not found for testing"}
    except Exception as e:
        diagnostics["refresh_tokens"] = {"status": "failed", "error": str(e)}
        all_ok = False
    
    return {
        "status": "healthy" if all_ok else "degraded",
        "diagnostics": diagnostics
    }


@app.put("/api/auth/personality", response_model=schemas.UserResponse, tags=["Auth"])
def update_personality(
    personality_data: schemas.PersonalityUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Updates the user's active AI personality companion."""
    persona = _normalize_persona(personality_data.personality)
    if persona not in ALLOWED_PERSONAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid personality mode selection."
        )
        
    current_user.active_personality = persona
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/api/preferences", response_model=schemas.PreferenceResponse, tags=["Preferences"])
def get_preferences(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return _preferences_payload(_ensure_preferences(db, current_user.id))


@app.put("/api/preferences", response_model=schemas.PreferenceResponse, tags=["Preferences"])
def update_preferences(
    payload: schemas.PreferenceUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    prefs = _ensure_preferences(db, current_user.id)
    if payload.theme is not None:
        prefs.theme = payload.theme
    if payload.active_tab is not None:
        prefs.active_tab = payload.active_tab
    if payload.communication_style is not None:
        prefs.communication_style = payload.communication_style
    if payload.dashboard_state is not None:
        prefs.dashboard_state_json = json.dumps(payload.dashboard_state)
    if payload.settings is not None:
        prefs.settings_json = json.dumps(payload.settings)
    db.commit()
    db.refresh(prefs)
    return _preferences_payload(prefs)


def get_user_cognitive_context(user_id: int, db: Session) -> dict:
    """
    Assembles recent conversation history, recent journal moods, stress triggers,
    and the latest burnout assessment scores to provide context for personalized AI responses.
    """
    # 1. Fetch recent conversation logs (last 5)
    recent_convs = db.query(models.Conversation).filter(
        models.Conversation.user_id == user_id
    ).order_by(models.Conversation.created_at.desc()).limit(5).all()
    
    history = []
    for c in reversed(recent_convs):
        history.append({
            "prompt": c.prompt,
            "response": c.response
        })
        
    # 2. Fetch recent journal moods and worry triggers (last 5)
    recent_journals = db.query(models.Journal).filter(
        models.Journal.user_id == user_id
    ).order_by(models.Journal.created_at.desc()).limit(5).all()
    
    recent_moods = [j.primary_mood for j in recent_journals if j.primary_mood]
    recent_triggers = []
    for j in recent_journals:
        if j.worry_triggers:
            recent_triggers.extend([t.strip() for t in j.worry_triggers.split(",") if t.strip()])
            
    # Clean up triggers duplicates
    recent_triggers = list(set(recent_triggers))[:5]
    
    # 3. Fetch latest burnout score
    latest_burnout = db.query(models.BurnoutLog).filter(
        models.BurnoutLog.user_id == user_id
    ).order_by(models.BurnoutLog.created_at.desc()).first()
    recent_burnout_score = latest_burnout.score if latest_burnout else 25
    
    return {
        "history": history,
        "recent_moods": recent_moods,
        "recent_triggers": recent_triggers,
        "recent_burnout_score": recent_burnout_score
    }


def build_ai_context(user_id: int, db: Session, query: str = "") -> dict:
    """Hybrid context: recency + semantic memory + emotional state snapshot."""
    base = get_user_cognitive_context(user_id, db)
    search_query = query.strip() or " ".join(base.get("recent_triggers") or []) or "emotional wellbeing"
    base["relevant_memories"] = retrieve_relevant_memories(
        db, user_id=user_id, query=search_query, limit=6
    )

    emotion = compute_emotional_state(base)
    base["emotional_state"] = {
        "anxiety_level": emotion.anxiety_level,
        "overwhelm_level": emotion.overwhelm_level,
        "burnout_risk": emotion.burnout_risk,
        "social_sensitivity": emotion.social_sensitivity,
        "confidence_level": emotion.confidence_level,
        "summary": emotion.summary,
    }

    db.add(
        models.EmotionalSnapshot(
            user_id=user_id,
            anxiety_level=emotion.anxiety_level,
            overwhelm_level=emotion.overwhelm_level,
            burnout_risk=emotion.burnout_risk,
            social_sensitivity=emotion.social_sensitivity,
            confidence_level=emotion.confidence_level,
            summary=emotion.summary,
        )
    )
    db.commit()
    return base


def _persist_conversation_memory(db: Session, conv: models.Conversation) -> None:
    upsert_memory(
        db,
        user_id=conv.user_id,
        source_type="conversation",
        source_id=conv.id,
        content=memory_content_from_conversation(conv),
        summary=conv.response[:240] if conv.response else None,
        tags=conv.category,
    )


def _record_ai_trace(db: Session, user_id: int, payload: dict, default_task: str) -> None:
    meta = payload.get("_ai_meta") if isinstance(payload, dict) else None
    if not isinstance(meta, dict):
        return
    db.add(
        models.AIRequestTrace(
            user_id=user_id,
            task=meta.get("task") or default_task,
            provider=meta.get("provider") or "unknown",
            model=meta.get("model") or "unknown",
            source=meta.get("source") or "unknown",
            latency_ms=int(meta.get("latency_ms") or 0),
            schema_errors=", ".join(meta.get("schema_errors") or []),
            fallback_reason=meta.get("fallback_reason"),
        )
    )
    db.commit()


def _record_generated_reply(db: Session, user_id: int, request: schemas.ReplyRequest, payload: dict) -> None:
    db.add(
        models.GeneratedReply(
            user_id=user_id,
            recipient_type=request.recipient_type,
            relationship_context=request.relationship_context,
            communication_style=request.communication_style,
            source_message=request.message,
            tone=request.tone,
            length=request.length,
            replies_json=json.dumps(payload.get("suggested_replies", [])),
        )
    )
    db.commit()


def _safety_payload(message: str, task: str) -> dict | None:
    safety = check_safety(message)
    if not safety.blocked:
        return None
    if task == "translate":
        return {
            "emotional_tone": "Crisis language detected",
            "hidden_intent": "The message may involve immediate safety needs.",
            "urgency_level": 10,
            "confidence_score": 100,
            "likely_meaning": "This needs human support, not interpretation.",
            "reassurance": safety.message,
            "suggestions": [
                "Call or text 988 if you are in the U.S. or Canada.",
                "Contact local emergency services if you may act on this.",
                "Stay near another person and move away from anything you could use to hurt yourself.",
            ],
            "_ai_meta": {"task": task, "source": "safety_layer", "provider": "safety", "model": "rules", "latency_ms": 0},
        }
    if task == "replies":
        return {
            "suggested_replies": [
                safety.message,
                "I care about your safety. Please contact emergency support or someone nearby right now.",
                "You do not have to handle this alone. Please reach out to a trusted person immediately.",
            ],
            "_ai_meta": {"task": task, "source": "safety_layer", "provider": "safety", "model": "rules", "latency_ms": 0},
        }
    return None


def _sse_from_stream(task: str, token_stream: Iterator[str], on_complete: Callable[[dict], None]):
    def event_generator():
        buffer = ""
        try:
            yield format_sse("start", {"task": task})
            for token in token_stream:
                buffer += token
                yield format_sse("delta", {"text": token})
            payload = ai_service.parse_streamed_json(buffer, task)
            on_complete(payload)
            yield format_sse("done", {"result": payload})
        except Exception as exc:
            yield format_sse("error", {"message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ==========================================
#               AI ENDPOINTS
# ==========================================

@app.get("/api/ai/status", tags=["AI Features"])
def get_ai_status(current_user: models.User = Depends(auth.get_current_user)):
    """Returns visible AI runtime state so the UI never hides fallback mode."""
    status_payload = ai_service.runtime_status()
    status_payload["voice"] = {
        "enabled": voice_service.enabled,
        "provider": "groq" if voice_service.enabled else "offline",
        "model": getattr(voice_service, "model", "local-fallback"),
    }
    return status_payload

@app.post("/api/ai/translate", response_model=schemas.OverthinkResponse, tags=["AI Features"])
def translate_overthinking(
    request: schemas.OverthinkRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Parses overthinking messages and returns core reassurance analysis."""
    safety = _safety_payload(request.message, "translate")
    if safety:
        _record_ai_trace(db, current_user.id, safety, "translate")
        return safety
    user_context = build_ai_context(current_user.id, db, query=request.message)
    analysis = ai_service.analyze_overthinking(
        message=request.message,
        context=request.context,
        personality=current_user.active_personality,
        user_context=user_context
    )
    
    # Save this event into conversation history
    new_conv = models.Conversation(
        user_id=current_user.id,
        prompt=f"Message: {request.message} | Context: {request.context}",
        response=json_to_text_summary(analysis),
        category="overthink"
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    _persist_conversation_memory(db, new_conv)
    _record_ai_trace(db, current_user.id, analysis, "translate")
    
    return analysis


@app.post("/api/ai/translate/stream", tags=["AI Features"])
def translate_overthinking_stream(
    request: schemas.OverthinkRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    safety = _safety_payload(request.message, "translate")
    if safety:
        def on_safety_complete(payload: dict) -> None:
            _record_ai_trace(db, current_user.id, payload, "translate")
        return _sse_from_stream("translate", iter([json.dumps(safety)]), on_safety_complete)

    user_context = build_ai_context(current_user.id, db, query=request.message)

    def on_complete(payload: dict) -> None:
        new_conv = models.Conversation(
            user_id=current_user.id,
            prompt=f"Message: {request.message} | Context: {request.context}",
            response=json_to_text_summary(payload),
            category="overthink",
        )
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        _persist_conversation_memory(db, new_conv)
        _record_ai_trace(db, current_user.id, payload, "translate")

    stream = ai_service.stream_analyze_overthinking(
        message=request.message,
        context=request.context or "",
        personality=current_user.active_personality,
        user_context=user_context,
    )
    return _sse_from_stream("translate", stream, on_complete)


@app.post("/api/ai/replies", response_model=schemas.ReplyResponse, tags=["AI Features"])
def generate_replies(
    request: schemas.ReplyRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generates three distinct contextual reply options based on tone parameters."""
    safety = _safety_payload(request.message, "replies")
    if safety:
        _record_ai_trace(db, current_user.id, safety, "replies")
        return safety
    user_context = build_ai_context(current_user.id, db, query=request.message)
    result = ai_service.generate_replies(
        message=request.message,
        tone=request.tone,
        length=request.length,
        personality=current_user.active_personality,
        user_context=user_context
    )
    
    # Save event to DB
    new_conv = models.Conversation(
        user_id=current_user.id,
        prompt=f"Reply Gen to: {request.message} | Tone: {request.tone}",
        response="; ".join(result.get("suggested_replies", [])),
        category="reply_gen"
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    _persist_conversation_memory(db, new_conv)
    _record_generated_reply(db, current_user.id, request, result)
    _record_ai_trace(db, current_user.id, result, "replies")
    
    return result


@app.post("/api/ai/replies/stream", tags=["AI Features"])
def generate_replies_stream(
    request: schemas.ReplyRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    safety = _safety_payload(request.message, "replies")
    if safety:
        def on_safety_complete(payload: dict) -> None:
            _record_ai_trace(db, current_user.id, payload, "replies")
        return _sse_from_stream("replies", iter([json.dumps(safety)]), on_safety_complete)

    user_context = build_ai_context(current_user.id, db, query=request.message)

    def on_complete(payload: dict) -> None:
        new_conv = models.Conversation(
            user_id=current_user.id,
            prompt=f"Reply Gen to: {request.message} | Tone: {request.tone}",
            response="; ".join(payload.get("suggested_replies", [])),
            category="reply_gen",
        )
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        _persist_conversation_memory(db, new_conv)
        _record_generated_reply(db, current_user.id, request, payload)
        _record_ai_trace(db, current_user.id, payload, "replies")

    stream = ai_service.stream_generate_replies(
        message=request.message,
        tone=request.tone,
        length=request.length,
        personality=current_user.active_personality,
        user_context=user_context,
    )
    return _sse_from_stream("replies", stream, on_complete)


@app.get("/api/ai/replies/history", response_model=List[schemas.GeneratedReplyResponse], tags=["AI Features"])
def list_generated_replies(
    limit: int = 20,
    skip: int = 0,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.GeneratedReply)
        .filter(models.GeneratedReply.user_id == current_user.id)
        .order_by(models.GeneratedReply.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": row.id,
            "user_id": row.user_id,
            "source_message": row.source_message,
            "tone": row.tone,
            "length": row.length,
            "recipient_type": row.recipient_type,
            "relationship_context": row.relationship_context,
            "communication_style": row.communication_style,
            "suggested_replies": json.loads(row.replies_json or "[]"),
            "created_at": row.created_at,
        }
        for row in rows
    ]


@app.post("/api/ai/simulate", response_model=schemas.SimulatedReaction, tags=["AI Features"])
def simulate_social_reaction(
    request: schemas.SimulatorRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Simulates difficult conversation reactions and generates emotionally intelligent phrasing."""
    safety = _safety_payload(f"{request.scenario} {request.custom_text or ''}", "simulate")
    if safety:
        return safety
    user_context = build_ai_context(
        current_user.id, db, query=f"{request.scenario} {request.custom_text or ''}"
    )
    simulation = ai_service.simulate_social_reaction(
        scenario=request.scenario,
        custom_text=request.custom_text,
        personality=current_user.active_personality,
        user_context=user_context
    )
    
    new_conv = models.Conversation(
        user_id=current_user.id,
        prompt=f"Simulation scenario: {request.scenario} | Text: {request.custom_text}",
        response=f"Safer wording: {simulation.get('safer_wording')}",
        category="social_sim"
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    _persist_conversation_memory(db, new_conv)
    _record_ai_trace(db, current_user.id, simulation, "simulate")
    
    return simulation


@app.post("/api/ai/simulate/stream", tags=["AI Features"])
def simulate_social_reaction_stream(
    request: schemas.SimulatorRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    safety = _safety_payload(f"{request.scenario} {request.custom_text or ''}", "simulate")
    if safety:
        def on_safety_complete(payload: dict) -> None:
            _record_ai_trace(db, current_user.id, payload, "simulate")
        return _sse_from_stream("simulate", iter([json.dumps(safety)]), on_safety_complete)

    user_context = build_ai_context(
        current_user.id, db, query=f"{request.scenario} {request.custom_text or ''}"
    )

    def on_complete(payload: dict) -> None:
        new_conv = models.Conversation(
            user_id=current_user.id,
            prompt=f"Simulation scenario: {request.scenario} | Text: {request.custom_text}",
            response=f"Safer wording: {payload.get('safer_wording')}",
            category="social_sim",
        )
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        _persist_conversation_memory(db, new_conv)
        _record_ai_trace(db, current_user.id, payload, "simulate")

    stream = ai_service.stream_simulate_social_reaction(
        scenario=request.scenario,
        custom_text=request.custom_text or "",
        personality=current_user.active_personality,
        user_context=user_context,
    )
    return _sse_from_stream("simulate", stream, on_complete)


@app.post("/api/voice/transcribe", response_model=schemas.TranscriptResponse, tags=["Voice"])
async def transcribe_voice(
    audio_file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not voice_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice transcription requires a GROQ_API_KEY for the free Whisper endpoint.",
        )
    audio_bytes = await audio_file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload.")
    try:
        result = voice_service.transcribe(audio_bytes, filename=audio_file.filename or "audio.webm")
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}")


# ==========================================
#             JOURNAL ENDPOINTS
# ==========================================

@app.post("/api/journal/add", response_model=schemas.JournalResponse, tags=["Journal"])
def add_journal_entry(
    entry: schemas.JournalCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a journal entry, runs the cognitive analysis AI, and returns indices."""
    user_context = build_ai_context(current_user.id, db, query=entry.entry_text)
    # Analyze entry text via NLP heuristics with user memory context
    analysis = ai_service.analyze_journal(entry.entry_text, current_user.active_personality, user_context=user_context)
    
    new_journal = models.Journal(
        user_id=current_user.id,
        entry_text=entry.entry_text,
        voice_url=entry.voice_url,
        primary_mood=analysis.get("primary_mood", entry.primary_mood),
        worry_triggers=analysis.get("worry_triggers", "general"),
        ai_summary=analysis.get("ai_summary", "Reflected on entry.")
    )
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)
    upsert_memory(
        db,
        user_id=current_user.id,
        source_type="journal",
        source_id=new_journal.id,
        content=memory_content_from_journal(new_journal),
        summary=new_journal.ai_summary,
        tags=new_journal.worry_triggers,
    )
    return new_journal


@app.get("/api/journal/list", response_model=List[schemas.JournalResponse], tags=["Journal"])
def list_journals(
    limit: int = 20,
    skip: int = 0,
    search: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches past journal records for the active authenticated user with pagination support."""
    query = db.query(models.Journal).filter(models.Journal.user_id == current_user.id)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (models.Journal.entry_text.ilike(term))
            | (models.Journal.primary_mood.ilike(term))
            | (models.Journal.worry_triggers.ilike(term))
        )
    return query.order_by(models.Journal.created_at.desc()).offset(skip).limit(limit).all()


@app.put("/api/journal/{journal_id}", response_model=schemas.JournalResponse, tags=["Journal"])
def update_journal_entry(
    journal_id: int,
    entry: schemas.JournalUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    journal = db.query(models.Journal).filter(
        models.Journal.id == journal_id,
        models.Journal.user_id == current_user.id,
    ).first()
    if not journal:
        raise HTTPException(status_code=404, detail="Journal entry not found.")
    if entry.entry_text is not None:
        journal.entry_text = entry.entry_text
        user_context = build_ai_context(current_user.id, db, query=entry.entry_text)
        analysis = ai_service.analyze_journal(entry.entry_text, current_user.active_personality, user_context=user_context)
        journal.primary_mood = analysis.get("primary_mood", journal.primary_mood)
        journal.worry_triggers = analysis.get("worry_triggers", journal.worry_triggers)
        journal.ai_summary = analysis.get("ai_summary", journal.ai_summary)
    if entry.primary_mood is not None:
        journal.primary_mood = entry.primary_mood
    if entry.voice_url is not None:
        journal.voice_url = entry.voice_url
    db.commit()
    db.refresh(journal)
    upsert_memory(
        db,
        user_id=current_user.id,
        source_type="journal",
        source_id=journal.id,
        content=memory_content_from_journal(journal),
        summary=journal.ai_summary,
        tags=journal.worry_triggers,
    )
    return journal


@app.delete("/api/journal/{journal_id}", tags=["Journal"])
def delete_journal_entry(
    journal_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    journal = db.query(models.Journal).filter(
        models.Journal.id == journal_id,
        models.Journal.user_id == current_user.id,
    ).first()
    if not journal:
        raise HTTPException(status_code=404, detail="Journal entry not found.")
    memory = db.query(models.UserMemory).filter(
        models.UserMemory.user_id == current_user.id,
        models.UserMemory.source_type == "journal",
        models.UserMemory.source_id == journal.id,
    ).first()
    if memory:
        db.delete(memory)
    db.delete(journal)
    db.commit()
    return {"deleted": True, "journal_id": journal_id}


@app.get("/api/journal/insights", tags=["Journal"])
def get_journal_insights(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregates journal moods and triggers to fuel the glowing visual heatmaps."""
    journals = db.query(models.Journal).filter(models.Journal.user_id == current_user.id).all()
    
    mood_counts = {}
    triggers_count = {}
    
    for j in journals:
        # Mood count
        mood = j.primary_mood
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
        
        # Triggers split
        if j.worry_triggers:
            parts = [p.strip().lower() for p in j.worry_triggers.split(",") if p.strip()]
            for p in parts:
                triggers_count[p] = triggers_count.get(p, 0) + 1
                
    return {
        "mood_distribution": mood_counts,
        "extracted_triggers": dict(sorted(triggers_count.items(), key=lambda item: item[1], reverse=True)[:5]),
        "total_entries": len(journals)
    }


# ==========================================
#             MEMORY & AI QUALITY
# ==========================================

@app.get("/api/memory/list", tags=["Memory"])
def list_memory(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Transparent memory controls: show what the AI can recall."""
    memories = (
        db.query(models.UserMemory)
        .filter(models.UserMemory.user_id == current_user.id)
        .order_by(models.UserMemory.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": m.id,
            "source_type": m.source_type,
            "source_id": m.source_id,
            "summary": m.summary,
            "tags": m.tags,
            "content_preview": m.content[:500],
            "has_embedding": bool(m.embedding_json),
            "created_at": m.created_at,
        }
        for m in memories
    ]


@app.delete("/api/memory/{memory_id}", tags=["Memory"])
def delete_memory(
    memory_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    memory = (
        db.query(models.UserMemory)
        .filter(models.UserMemory.id == memory_id, models.UserMemory.user_id == current_user.id)
        .first()
    )
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found.")
    db.delete(memory)
    db.commit()
    return {"deleted": True, "memory_id": memory_id}


@app.get("/api/ai/quality", tags=["AI Features"])
def ai_quality_dashboard(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    traces = (
        db.query(models.AIRequestTrace)
        .filter(models.AIRequestTrace.user_id == current_user.id)
        .order_by(models.AIRequestTrace.created_at.desc())
        .limit(100)
        .all()
    )
    memories_count = db.query(models.UserMemory).filter(models.UserMemory.user_id == current_user.id).count()
    llm_count = sum(1 for t in traces if t.source == "llm")
    fallback_count = sum(1 for t in traces if t.source != "llm")
    avg_latency = int(sum(t.latency_ms or 0 for t in traces) / len(traces)) if traces else 0
    schema_error_count = sum(1 for t in traces if t.schema_errors)
    personalization_score = min(100, 20 + memories_count * 8)
    reliability_score = max(0, 100 - fallback_count * 12 - schema_error_count * 10)
    return {
        "total_ai_requests": len(traces),
        "llm_requests": llm_count,
        "fallback_requests": fallback_count,
        "average_latency_ms": avg_latency,
        "memory_count": memories_count,
        "personalization_score": personalization_score,
        "ai_quality_score": reliability_score,
        "response_diversity_score": 70 if llm_count else 35,
        "recent_traces": [
            {
                "task": t.task,
                "provider": t.provider,
                "model": t.model,
                "source": t.source,
                "latency_ms": t.latency_ms,
                "schema_errors": t.schema_errors,
                "created_at": t.created_at,
            }
            for t in traces[:10]
        ],
    }


# ==========================================
#             DECISION ENDPOINTS
# ==========================================

@app.post("/api/decisions/add", response_model=schemas.DecisionResponse, tags=["Decisions"])
def add_decision(
    decision: schemas.DecisionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Logs a pending decision item."""
    new_dec = models.Decision(
        user_id=current_user.id,
        title=decision.title,
        category=decision.category,
        priority=decision.priority,
        difficulty=decision.difficulty,
        status="Pending"
    )
    db.add(new_dec)
    db.commit()
    db.refresh(new_dec)
    return new_dec


@app.get("/api/decisions/list", response_model=List[schemas.DecisionResponse], tags=["Decisions"])
def list_decisions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches list of decisions logged by the current user."""
    return db.query(models.Decision).filter(models.Decision.user_id == current_user.id).order_by(models.Decision.created_at.desc()).all()


@app.put("/api/decisions/{decision_id}/status", response_model=schemas.DecisionResponse, tags=["Decisions"])
def update_decision_status(
    decision_id: int,
    update: schemas.DecisionUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Updates status or recommendation fields on a decision card."""
    decision = db.query(models.Decision).filter(
        models.Decision.id == decision_id,
        models.Decision.user_id == current_user.id
    ).first()
    
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found.")
        
    decision.status = update.status
    if update.optimal_time:
        decision.optimal_time = update.optimal_time
        
    db.commit()
    db.refresh(decision)
    return decision


@app.get("/api/decisions/optimize", tags=["Decisions"])
def optimize_daily_flow(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    DECISION FATIGUE REDUCTION ENGINE:
    Arranges pending items, constructs a stress-minimized action plan,
    and returns cognitive metrics (Mental Load Score and Decision Pressure Meter).
    """
    # Fetch pending decisions
    pending = db.query(models.Decision).filter(
        models.Decision.user_id == current_user.id,
        models.Decision.status == "Pending"
    ).all()
    
    # Core Algorithms: Calculate Pressure & Load scores
    # If no pending, base levels are low.
    num_pending = len(pending)
    decision_pressure = min(100, int(num_pending * 18 + sum(d.priority * 5 for d in pending)))
    
    # Fetch recent burnout rating
    latest_burnout = db.query(models.BurnoutLog).filter(
        models.BurnoutLog.user_id == current_user.id
    ).order_by(models.BurnoutLog.created_at.desc()).first()
    
    burnout_score = latest_burnout.score if latest_burnout else 25
    
    # Mental Load is a combination of pending workload and active fatigue
    mental_load = min(100, int((decision_pressure * 0.6) + (burnout_score * 0.4)))
    
    # Smart schedule sequencing
    # Rules: High Priority & High Difficulty tasks mapped to Morning (high energy)
    # Low difficulty tasks mapped to Afternoon (post-lunch dip)
    # Leisure/rest mapped to evening
    
    schedule = []
    start_time = datetime.strptime("09:00 AM", "%I:%M %p")
    
    # Sort: high priority first, then high difficulty
    sorted_decisions = sorted(pending, key=lambda x: (x.priority, x.difficulty), reverse=True)
    
    category_icons = {
        "work": "Briefcase",
        "study": "BookOpen",
        "food": "Coffee",
        "rest": "Moon"
    }
    
    for i, dec in enumerate(sorted_decisions):
        time_slot = (start_time + timedelta(hours=i * 2.5)).strftime("%I:%M %p")
        
        # Assign optimal slot in DB
        dec.optimal_time = time_slot
        
        schedule.append({
            "decision_id": dec.id,
            "title": dec.title,
            "time_slot": time_slot,
            "category": dec.category,
            "icon": category_icons.get(dec.category.lower(), "Activity"),
            "energy_bracket": "High Energy" if i == 0 else "Moderate" if i == 1 else "Low Focus Required",
            "suggestion": f"Approach with focus. Recommended to timebox to exactly 45 minutes, followed by a 10-minute detox stretch."
        })
        
    db.commit() # Save timeslots
    
    # Personality greeting tailor
    personality = current_user.active_personality
    ai_advice = "Your mind is clear and you have complete control over your schedule today. Breathe."
    
    if personality == "Calm Therapist":
        ai_advice = f"I've mapped out a stress-minimized flow with {num_pending} decisions. We placed demanding tasks where your focus peaks naturally, leaving plenty of space to breathe. Let's tackle them one at a time."
    elif personality == "Best Friend":
        ai_advice = f"Okay, no sweating allowed! We've got {num_pending} things to decide. I locked down the annoying stuff early so you can completely relax this afternoon. You've got this, let's get it done!"
    elif personality == "Productivity Mentor":
        ai_advice = f"Cognitive backlog is currently at {num_pending} pending nodes. I've sequenced today's schedule for maximum efficiency. Execute the morning high-cognitive blocks first, and batch-process the rest."
    elif personality == "Confidence Builder":
        ai_advice = f"Look at these {num_pending} options not as weights, but as steps towards your personal growth. Your schedule is optimized for victory today. Stand tall and step forward!"
    elif personality == "Logical Analyst":
        ai_advice = f"There are {num_pending} pending decisions. I ranked them by priority and difficulty so the highest-impact uncertainty is handled first."
    elif personality == "Decision Coach":
        ai_advice = f"I converted your open loops into a sequenced decision plan. Start with the first item, resolve it, then move to the next card."
    elif personality == "Tough Love Coach":
        ai_advice = f"You have {num_pending} unresolved decisions, and letting them sit will cost more attention than handling them. Start with the first hard thing and keep the promise small."
    elif personality == "Social Coach":
        ai_advice = f"I organized {num_pending} choices around emotional bandwidth and relationship clarity. Handle anything people-facing while you still have patience and precision."
    elif personality == "Career Mentor":
        ai_advice = f"I prioritized work that protects momentum and reputation first, then moved lower-leverage choices later in the day."
    elif personality == "Adaptive Companion":
        ai_advice = f"I shaped today's {num_pending} decisions around your current load, recent patterns, and need for steadier pacing. Start where relief and progress overlap."
        
    return {
        "mental_load_score": mental_load,
        "decision_pressure_meter": decision_pressure,
        "pending_count": num_pending,
        "ai_optimized_schedule": schedule,
        "personality_advice": ai_advice
    }


# ==========================================
#             BURNOUT ENDPOINTS
# ==========================================

@app.post("/api/burnout/assess", response_model=schemas.BurnoutResponse, tags=["Burnout"])
def assess_burnout(
    assessment: schemas.BurnoutCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    BURNOUT DETECTION ENGINE:
    Evaluates burnout metrics, logs active vs sleep coordinates,
    computes warning levels, and writes actionable wellness scripts.
    """
    score = 20  # Baseline
    
    # Active hours stressor
    if assessment.active_hours > 9.5:
        score += int((assessment.active_hours - 9.5) * 12)
    # Sleep deficit stressor
    if assessment.sleep_hours < 7.0:
        score += int((7.0 - assessment.sleep_hours) * 15)
        
    # Boolean checkboxes
    if assessment.felt_exhausted:
        score += 20
    if assessment.anxious_today:
        score += 15
    if assessment.skipped_breaks:
        score += 10
        
    score = min(100, max(0, score))
    
    # Determine stress bracket
    if score < 30:
        level = "Low"
        rec = "You have an excellent energetic equilibrium. Maintain your current active boundaries and celebrate your balanced pace."
    elif score < 55:
        level = "Mild"
        rec = "Slight accumulation of mental exhaustion detected. We recommend incorporating a scheduled 10-minute digital detox after your next focus block."
    elif score < 75:
        level = "Moderate"
        rec = "Noticeable burnout signals visible. You are skipping breaks and accumulating a sleep deficit. Please protect your evening: mute Slack, skip secondary chores, and rest."
    elif score < 90:
        level = "High"
        rec = "CRITICAL RESOURCE WARNING: Your body is running on fumes. Take immediate action: timebox work blocks strictly to 30 minutes, perform a 4-7-8 breathing circle now, and schedule an early sleep window tonight."
    else:
        level = "Critical"
        rec = "COGNITIVE EMERGENCY SHUTDOWN ADVISED: Total mental overload. Your decision quality and emotional boundaries are severely compromised. Step away from all screens immediately and take a 20-minute silent walk."

    # Personalized tone overlay
    personality = current_user.active_personality
    if personality == "Calm Therapist":
        rec = f"I feel how hard you've been working, but your battery is at {100 - score}%. {rec} Be gentle with yourself."
    elif personality == "Best Friend":
        rec = f"Whoa, stop right there! You are pushing way too hard and your battery is at {100 - score}%. {rec} Seriously, take a break, let's chat!"
    elif personality == "Productivity Mentor":
        rec = f"WARNING: Cognitive performance degradation active. Energy capacity at {100 - score}%. {rec} Rest immediately to recover output capability."
    elif personality == "Logical Analyst":
        rec = f"Energy reserve is approximately {100 - score}%. {rec} Treat this as data: reduce inputs, protect sleep, and recheck tomorrow."
    elif personality == "Decision Coach":
        rec = f"Your recovery choice is the priority decision now. Energy reserve: {100 - score}%. {rec} Pick one protective action and commit to it."
    elif personality == "Confidence Builder":
        rec = f"Your energy is at {100 - score}%, but this is recoverable. {rec} Rest is not retreat; it is how you come back stronger."
    elif personality == "Tough Love Coach":
        rec = f"Energy reserve is {100 - score}%. {rec} This is the moment to stop negotiating with exhaustion and take the break."
    elif personality == "Social Coach":
        rec = f"Energy reserve is {100 - score}%. {rec} Keep communication low-stakes until you are rested; tired brains make social signals look sharper than they are."
    elif personality == "Career Mentor":
        rec = f"Energy reserve is {100 - score}%. {rec} Protecting recovery now protects judgment, consistency, and long-term credibility."
    elif personality == "Adaptive Companion":
        rec = f"I am reading your current reserve at {100 - score}%. {rec} Choose the recovery step that fits your actual evening, not an ideal version of it."
        
    new_log = models.BurnoutLog(
        user_id=current_user.id,
        score=score,
        stress_level=level,
        active_hours=assessment.active_hours,
        sleep_hours=assessment.sleep_hours,
        recommendation=rec
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


@app.get("/api/burnout/history", response_model=List[schemas.BurnoutResponse], tags=["Burnout"])
def list_burnout_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches user's historical burnout ratings to fuel trend analysis graphs."""
    return db.query(models.BurnoutLog).filter(models.BurnoutLog.user_id == current_user.id).order_by(models.BurnoutLog.created_at.asc()).all()


# ==========================================
#             UTILITY MODULES
# ==========================================

def json_to_text_summary(data: dict) -> str:
    """Serializes a JSON analysis map into a friendly readable string for database archiving."""
    return f"Tone: {data.get('emotional_tone')} | Intent: {data.get('hidden_intent')} | Reassurance: {data.get('reassurance')}"

if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )