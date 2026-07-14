from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- AUTH SCHEMAS ---

class UserAuth(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class LoginRequest(UserAuth):
    remember: bool = False

class PasswordResetRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class PasswordResetConfirm(BaseModel):
    token: str = Field(..., min_length=20)
    new_password: str = Field(..., min_length=8)

class UsernameCheck(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UserResponse(BaseModel):
    id: int
    username: str
    active_personality: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class RefreshResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class PreferenceUpdate(BaseModel):
    theme: Optional[str] = None
    active_tab: Optional[str] = None
    communication_style: Optional[str] = None
    dashboard_state: Optional[dict] = None
    settings: Optional[dict] = None

class PreferenceResponse(BaseModel):
    theme: str
    active_tab: str
    communication_style: str
    dashboard_state: dict
    settings: dict


# --- JOURNAL SCHEMAS ---

class JournalCreate(BaseModel):
    entry_text: str
    voice_url: Optional[str] = None
    primary_mood: str

class JournalUpdate(BaseModel):
    entry_text: Optional[str] = None
    primary_mood: Optional[str] = None
    voice_url: Optional[str] = None

class JournalResponse(BaseModel):
    id: int
    user_id: int
    entry_text: str
    voice_url: Optional[str]
    primary_mood: str
    worry_triggers: Optional[str]
    ai_summary: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- DECISION SCHEMAS ---

class DecisionCreate(BaseModel):
    title: str
    category: str  # food, work, study, rest
    priority: int = Field(1, ge=1, le=3)  # 1: Low, 2: Med, 3: High
    difficulty: int = Field(1, ge=1, le=3)  # 1: Easy, 2: Med, 3: Hard

class DecisionUpdate(BaseModel):
    status: str  # Pending, Done, Deferred
    optimal_time: Optional[str] = None

class DecisionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    category: str
    priority: int
    difficulty: int
    optimal_time: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- BURNOUT SCHEMAS ---

class BurnoutCreate(BaseModel):
    active_hours: float = Field(8.0, ge=0, le=24)
    sleep_hours: float = Field(7.0, ge=0, le=24)
    felt_exhausted: bool = False
    anxious_today: bool = False
    skipped_breaks: bool = False

class BurnoutResponse(BaseModel):
    id: int
    user_id: int
    score: int
    stress_level: str
    active_hours: float
    sleep_hours: float
    recommendation: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- AI FEATURE SCHEMAS ---

class OverthinkRequest(BaseModel):
    message: str
    context: Optional[str] = ""

class OverthinkResponse(BaseModel):
    emotional_tone: str
    hidden_intent: str
    urgency_level: int  # 1-10
    confidence_score: int  # 1-100
    likely_meaning: str
    reassurance: str
    suggestions: List[str]

class ReplyRequest(BaseModel):
    message: str
    tone: str  # Casual, Professional, Empathetic, Confident, Friendly, Boundary-Setting
    length: str = "Medium"  # Short, Medium, Long
    recipient_type: Optional[str] = None
    relationship_context: Optional[str] = None
    communication_style: Optional[str] = None

class ReplyResponse(BaseModel):
    suggested_replies: List[str]

class GeneratedReplyResponse(BaseModel):
    id: int
    user_id: int
    source_message: str
    tone: str
    length: str
    recipient_type: Optional[str]
    relationship_context: Optional[str]
    communication_style: Optional[str]
    suggested_replies: List[str]
    created_at: datetime

class SimulatorRequest(BaseModel):
    scenario: str  # e.g., "apology_friend", "salary_negotiation", "conflict_roommate"
    custom_text: Optional[str] = ""

class SimulatedReaction(BaseModel):
    best_case_reaction: str
    worst_case_reaction: str
    safer_wording: str
    confidence_analysis: str

class PersonalityUpdate(BaseModel):
    personality: str  # Calm Therapist, Smart Best Friend, etc.


class TranscriptResponse(BaseModel):
    transcript: str
    language: Optional[str] = None
