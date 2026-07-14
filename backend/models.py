from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="refresh_tokens")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    active_personality = Column(String(50), default="Calm Therapist")  # Calm Therapist, Smart Best Friend, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    journals = relationship("Journal", back_populates="user", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="user", cascade="all, delete-orphan")
    burnout_logs = relationship("BurnoutLog", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("UserMemory", back_populates="user", cascade="all, delete-orphan")
    emotional_snapshots = relationship("EmotionalSnapshot", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", cascade="all, delete-orphan", uselist=False)
    generated_replies = relationship("GeneratedReply", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")


class UserPreference(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (Index("ix_user_preferences_user", "user_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    theme = Column(String(50), default="dark-emotional")
    active_tab = Column(String(50), default="dashboard")
    communication_style = Column(String(100), default="warm, clear, concise")
    dashboard_state_json = Column(Text, default="{}")
    settings_json = Column(Text, default="{}")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="preferences")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="password_reset_tokens")


class Journal(Base):
    __tablename__ = "journals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    entry_text = Column(Text, nullable=False)
    voice_url = Column(String(255), nullable=True)  # Path/URL if voice note is recorded
    primary_mood = Column(String(50), nullable=False)  # Anxiety, Burnout, Calm, Excitement, Tired, etc.
    worry_triggers = Column(String(255), nullable=True)  # Comma-separated list of extracted worry words
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="journals")


class Decision(Base):
    __tablename__ = "decisions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # food, work, study, rest
    priority = Column(Integer, default=1)  # 1 (Low), 2 (Medium), 3 (High)
    difficulty = Column(Integer, default=1)  # 1 (Easy) to 3 (Hard)
    optimal_time = Column(String(100), nullable=True)  # Generated recommendation slot (e.g. 09:00 AM)
    status = Column(String(50), default="Pending")  # Pending, Done, Deferred
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="decisions")


class BurnoutLog(Base):
    __tablename__ = "burnout_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    score = Column(Integer, nullable=False)  # 0 to 100
    stress_level = Column(String(50), nullable=False)  # Low, Mild, Moderate, High, Critical
    active_hours = Column(Float, default=8.0)
    sleep_hours = Column(Float, default=7.0)
    recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="burnout_logs")


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # overthink, reply_gen, social_sim, normal
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="conversations")


class GeneratedReply(Base):
    __tablename__ = "generated_replies"
    __table_args__ = (Index("ix_generated_replies_user_created", "user_id", "created_at"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_type = Column(String(100), nullable=True)
    relationship_context = Column(Text, nullable=True)
    communication_style = Column(String(100), nullable=True)
    source_message = Column(Text, nullable=False)
    tone = Column(String(50), nullable=False)
    length = Column(String(50), nullable=False)
    replies_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="generated_replies")


class UserMemory(Base):
    """Unified semantic memory store (pgvector-ready via embedding_json)."""
    __tablename__ = "user_memories"
    __table_args__ = (
        Index("ix_user_memories_user_created", "user_id", "created_at"),
        Index("ix_user_memories_user_source", "user_id", "source_type", "source_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)  # conversation, journal, decision, burnout
    source_id = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    tags = Column(String(255), nullable=True)
    embedding_json = Column(Text, nullable=True)  # JSON float[]; use pgvector column in Postgres migrations later
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="memories")


class EmotionalSnapshot(Base):
    """Per-request or periodic emotional state for adaptive responses."""
    __tablename__ = "emotional_snapshots"
    __table_args__ = (Index("ix_emotional_snapshots_user_created", "user_id", "created_at"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    anxiety_level = Column(Integer, default=25)
    overwhelm_level = Column(Integer, default=20)
    burnout_risk = Column(Integer, default=25)
    social_sensitivity = Column(Integer, default=30)
    confidence_level = Column(Integer, default=70)
    summary = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="emotional_snapshots")


class AIRequestTrace(Base):
    """Auditable metadata for every AI request."""
    __tablename__ = "ai_request_traces"
    __table_args__ = (Index("ix_ai_request_traces_user_created", "user_id", "created_at"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task = Column(String(50), nullable=False)
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    source = Column(String(50), nullable=False)
    latency_ms = Column(Integer, default=0)
    schema_errors = Column(Text, nullable=True)
    fallback_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
