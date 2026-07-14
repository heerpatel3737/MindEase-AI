import os
import json
import re
from dotenv import load_dotenv
from typing import Optional

from ai.llm import LlmClient, LlmMessage
from ai.orchestrator import AiOrchestrator

load_dotenv(override=True)

class AIService:
    """
    Mental load and emotional AI service layer.
    Integrates with free AI providers when API keys are available,
    and falls back to a local heuristic NLP engine
    when offline or without credentials.
    """
    
    def __init__(self):
        # New modular orchestrator. This is the default execution path.
        # We keep legacy methods below for compatibility, but they now route through this layer.
        self._orchestrator = AiOrchestrator()
        self.client = LlmClient()
        if self.client.enabled:
            provider_names = ", ".join(p.name for p in self.client.providers)
            print(f"AI SERVICE: Free AI providers configured: {provider_names}.")
        else:
            print("AI SERVICE: No free AI provider key found. Using local heuristic fallback.")

    def runtime_status(self) -> dict:
        return self._orchestrator.runtime_status()

    def _get_memory_prompt(self, user_context: Optional[dict]) -> str:
        if not user_context:
            return ""
        
        history_lines = []
        if user_context.get("history"):
            for h in user_context["history"][-5:]:
                history_lines.append(f"- User: {h.get('prompt')}\n  AI: {h.get('response')}")
        history_str = "\n".join(history_lines) if history_lines else "No recent interactions logged."
        
        recent_moods = ", ".join(user_context.get("recent_moods", [])) or "None logged"
        recent_triggers = ", ".join(user_context.get("recent_triggers", [])) or "None identified"
        recent_burnout_score = user_context.get("recent_burnout_score", 25)
        
        return f"""
        
        === USER COGNITIVE MEMORY MATRIX ===
        Here is the historical context of this user:
        - Recent Mood Indicators: {recent_moods}
        - Persistent Worry/Anxiety Triggers: {recent_triggers}
        - Recent Burnout/Fatigue Score: {recent_burnout_score}%
        
        - Recent Conversation Logs:
        {history_str}
        
        INSTRUCTIONS:
        Use these historical parameters to tailor your therapeutic response and advice. Ensure your phrasing addresses any recurring stress triggers or elevated burnout indicators where relevant, without meta-commenting on the memory context itself.
        """

    def _normalize_persona(self, personality: str) -> str:
        return {
            "Smart Best Friend": "Best Friend",
            "Productivity Coach": "Productivity Mentor",
            "Motivational Mentor": "Confidence Builder",
            "Minimal Assistant": "Decision Coach",
            "Analytical Advisor": "Logical Analyst",
            "Compassionate Listener": "Calm Therapist",
            "Pragmatic Advisor": "Decision Coach",
            "Emotional Nurturer": "Confidence Builder",
        }.get(personality, personality)

    # --- 1. OVERTHINKING TRANSLATOR ---
    def analyze_overthinking(self, message: str, context: str = "", personality: str = "Calm Therapist", user_context: Optional[dict] = None) -> dict:
        """
        Translates a text or email message into an emotional map, likely intent, urgency level,
        and provides reassurance cards.
        """
        try:
            return self._orchestrator.analyze_overthinking(
                message=message,
                context=context,
                personality=personality,
                user_context=user_context,
            ).payload
        except Exception as e:
            # Keep legacy fallback as last resort while we migrate.
            print(f"AI orchestrator failed, using local fallback: {e}")
            return self._local_overthink_fallback(message, context, personality, user_context)

    # --- 2. AI REPLY GENERATOR ---
    def generate_replies(self, message: str, tone: str, length: str, personality: str = "Calm Therapist", user_context: Optional[dict] = None) -> dict:
        """
        Generates three variations of a reply in a selected tone (Casual, Professional, Boundary-Setting, etc.)
        adjusted to the active AI personality's voice guidelines.
        """
        try:
            return self._orchestrator.generate_replies(
                message=message,
                tone=tone,
                length=length,
                personality=personality,
                user_context=user_context,
            ).payload
        except Exception as e:
            print(f"AI orchestrator failed, using local fallback: {e}")
            return self._local_replies_fallback(message, tone, length, personality, user_context)

    # --- 3. SOCIAL CONFIDENCE SIMULATOR ---
    def simulate_social_reaction(self, scenario: str, custom_text: str = "", personality: str = "Calm Therapist", user_context: Optional[dict] = None) -> dict:
        """
        Simulates best and worst-case reactions to a hard conversation topic and provides safer wording.
        """
        try:
            return self._orchestrator.simulate_social_reaction(
                scenario=scenario,
                custom_text=custom_text,
                personality=personality,
                user_context=user_context,
            ).payload
        except Exception as e:
            print(f"AI orchestrator failed, using local fallback: {e}")
            return self._local_simulator_fallback(scenario, custom_text, personality, user_context)

    def stream_analyze_overthinking(self, **kwargs):
        return self._orchestrator.stream_analyze_overthinking(**kwargs)

    def stream_generate_replies(self, **kwargs):
        return self._orchestrator.stream_generate_replies(**kwargs)

    def stream_simulate_social_reaction(self, **kwargs):
        return self._orchestrator.stream_simulate_social_reaction(**kwargs)

    def parse_streamed_json(self, raw: str, task: str) -> dict:
        return self._orchestrator.parse_streamed_json(raw, task).payload

    # --- 4. JOURNAL TRIGGER EXTRACTION ---
    def analyze_journal(self, entry_text: str, personality: str = "Calm Therapist", user_context: Optional[dict] = None) -> dict:
        """
        Summarizes a journal entry, detects worry triggers, and extracts the primary mood.
        """
        if self.client.enabled:
            try:
                memory_prompt = self._get_memory_prompt(user_context)
                prompt = f"""
                You are the {personality} mode of MindEase AI.
                Analyze the user's journal entry to extract mood, triggers, and supply a warm reflective summary.
                {memory_prompt}
                
                Journal text: "{entry_text}"
                
                Respond ONLY with a valid JSON object matching this schema:
                {{
                  "primary_mood": "Single word mood: Calm, Anxiety, Overloaded, Tired, Excitement, Sad, or Content",
                  "worry_triggers": "Comma-separated list of 3 key topics causing stress (e.g. deadlines, relationships, fatigue)",
                  "ai_summary": "A highly compassionate, supportive, therapeutic summary reflecting on their thoughts."
                }}
                Do not include markdown tags.
                """
                content = self.client.complete_json(
                    model="default",
                    messages=[LlmMessage(role="user", content=prompt)],
                    temperature=0.6,
                    top_p=0.9,
                )
                if content.startswith("```"):
                    content = re.sub(r"^```json\s*|\s*```$", "", content, flags=re.MULTILINE)
                return json.loads(content)
            except Exception as e:
                print(f"Free AI journal analysis failed, fallback to local: {e}")
                
        # --- LOCAL HEURISTICS FALLBACK ---
        return self._local_journal_fallback(entry_text, personality, user_context)


    # ==========================================
    #      LOCAL NLP HEURISTIC ENGINE IMPLEMENTATION
    # ==========================================
    
    def _local_overthink_fallback(self, message: str, context: str, personality: str, user_context: Optional[dict]) -> dict:
        personality = self._normalize_persona(personality)
        msg_lower = message.lower()
        
        # 1. Analyze emotional cues & triggers
        detected_triggers = []
        tone = "Neutral, standard communication."
        intent = "Delivering standard structural information."
        likely_meaning = "The sender is likely writing quickly or focused on coordinates rather than emotions."
        urgency = 3
        confidence = 85
        
        # Check delayed response indicators
        if any(w in msg_lower for w in ["sorry for the delay", "delayed", "late", "just seeing this"]):
            detected_triggers.append("delay")
            tone = "Polite, slightly apologetic but essentially neutral."
            intent = "Acknowledging timing and moving immediately to the subject."
            likely_meaning = "They were caught up with other obligations, meetings, or life. It has nothing to do with their opinion of you."
            urgency = 4
            
        # Check brief response indicators
        elif len(message.split()) <= 4:
            detected_triggers.append("short")
            tone = "Extremely brief, functional, direct."
            intent = "Confirming receipt or acknowledging status with minimal friction."
            likely_meaning = "They are multitasking, walking, or answering from a mobile notification. They chose speed over flowery words, which is positive!"
            urgency = 2
            
        # Check passive-aggressive / punctuation worries
        elif "ok" in msg_lower or "fine" in msg_lower or "no problem" in msg_lower:
            detected_triggers.append("punctuation")
            tone = "Compact, functional, slightly formal."
            intent = "Acceptance of a proposal or statement."
            likely_meaning = "They are accepting your point completely. The lack of exclamation marks or smiley emojis represents standard professional boundaries, not anger."
            urgency = 2
            confidence = 75

        # Check busy/work stress
        elif any(w in msg_lower for w in ["busy", "deadline", "tomorrow", "asap", "urgent", "later"]):
            detected_triggers.append("busy")
            tone = "Slightly rushed, task-focused, overloaded."
            intent = "Setting temporary boundaries or coordinating timelines."
            likely_meaning = "They are managing their own high-cognitive schedule right now. They want to give you a proper answer once their queue clears."
            urgency = 8

        # Default fallback categorization
        if not detected_triggers:
            likely_meaning = "This message is clear, standard communication. The lack of explicit emotional warmth is a byproduct of typical text-based brevity."

        # Customize responses based on AI Personality
        reassurance = ""
        suggestions = []
        
        if personality == "Calm Therapist":
            reassurance = "Inhale slowly. Notice how your mind immediately rushed to fill the silence with a negative assumption. The text contains zero indicators of anger. Let it rest."
            suggestions = [
                "Take a deep breath and close the chat window for 10 minutes.",
                "Remind yourself: You are not responsible for decoding micro-expressions in text messages.",
                "Reply with a warm, standard acknowledgment without over-explaining."
            ]
        elif personality == "Best Friend":
            reassurance = "Listen to me: they are literally just typing with one hand while grabbing a coffee or sitting in a meeting. They are definitely not mad at you. Chill out!"
            suggestions = [
                "Draft a super short reply and send it. Don't stare at the typing bubbles.",
                "Treat yourself to a glass of water. You are driving yourself crazy for nothing.",
                "Send a funny GIF to break the ice if you feel too awkward."
            ]
        elif personality == "Productivity Mentor":
            reassurance = "This is a low-value concern draining your focus block. The message is fully functional. Let's process it, archive the task, and move back to your primary goals."
            suggestions = [
                "Timebox this response to exactly 60 seconds.",
                "Draft a 1-sentence concise response to keep execution moving.",
                "Mute the conversation notification for the next 2 hours to protect your focus."
            ]
        elif personality == "Confidence Builder":
            reassurance = "Your empathy is a beautiful strength, but do not let it create self-doubt. This message is an opportunity to practice emotional confidence and secure communication."
            suggestions = [
                "Respond with assertiveness and complete confidence.",
                "Remind yourself that clear boundaries build strong, respected partnerships.",
                "Focus on the concrete facts of the message, not the imagined tone."
            ]
        elif personality == "Logical Analyst":
            reassurance = "The evidence in this message does not support the strongest negative interpretation. The simpler explanation is that the sender is communicating efficiently."
            suggestions = [
                "Separate what the text literally says from what you are inferring.",
                "Reply to the facts only.",
                "Look for one concrete data point before assuming emotional meaning."
            ]
        elif personality == "Tough Love Coach":
            reassurance = "This is the loop: your brain wants certainty from a message that cannot provide it. Stop negotiating with the uncertainty and take the next normal action."
            suggestions = [
                "Send one clear reply.",
                "Do not reread the thread for 20 minutes.",
                "Put your attention back on something real and useful."
            ]
        elif personality == "Social Coach":
            reassurance = "Socially, this reads more like brief coordination than rejection. The safest move is warm, simple, and not over-explained."
            suggestions = [
                "Mirror their level of detail.",
                "Use one friendly sentence.",
                "Avoid asking if they are mad unless there is real evidence."
            ]
        elif personality == "Career Mentor":
            reassurance = "From a professional lens, concise messages are common and usually signal workload, not disapproval. Respond with clarity and keep your credibility steady."
            suggestions = [
                "Acknowledge the task or update directly.",
                "Clarify the next deliverable if needed.",
                "Keep the response professional and brief."
            ]
        else: # Decision Coach
            reassurance = "The message is neutral. It requires standard factual confirmation. Overthinking is unnecessary."
            suggestions = [
                "Acknowledge the message directly.",
                "Focus on remaining tasks."
            ]

        # Apply User Context (Memory Layer fallback customization)
        if user_context:
            burnout = user_context.get("recent_burnout_score", 0)
            if burnout > 60:
                reassurance += f" Crucially, your system diagnostic reports high burnout ({burnout}% exhaustion level). Save your energy and defer secondary tasks."
                suggestions.insert(0, "Close all tabs and spend 5 minutes with the 4-7-8 Respiratory Regulator.")
            
            recent_triggers = user_context.get("recent_triggers", [])
            for rt in recent_triggers:
                if rt.lower() in message.lower():
                    reassurance = f"Note: This aligns with your recurring worry trigger regarding '{rt.upper()}'. " + reassurance
            
        return {
            "emotional_tone": tone,
            "hidden_intent": intent,
            "urgency_level": urgency,
            "confidence_score": confidence,
            "likely_meaning": likely_meaning,
            "reassurance": reassurance,
            "suggestions": suggestions
        }

    def _local_replies_fallback(self, message: str, tone: str, length: str, personality: str, user_context: Optional[dict]) -> dict:
        personality = self._normalize_persona(personality)
        # Default options
        replies = []
        
        if tone == "Empathetic":
            replies = [
                "I completely understand where you're coming from. Take all the time you need, and we can catch up whenever things settle down.",
                "That sounds like a lot to carry right now. Sending you lots of warmth. Let me know if there's any small thing I can take off your plate.",
                "I appreciate you letting me know! Please prioritize yourself first, we can easily sync up later."
            ]
        elif tone == "Casual":
            replies = [
                "No worries at all! Let's just catch up next week when things are a bit calmer. Have a good one!",
                "All good! Totally get it. Talk soon!",
                "Haha no stress! Appreciate the heads up. Let's chat later."
            ]
        elif tone == "Professional":
            replies = [
                "Thank you for the update. Let's reschedule our discussion for a time that fits your current priorities.",
                "Understood. I will proceed with the current specifications and provide an update by tomorrow morning.",
                "Thank you for informing me. Please let me know when your calendar clears so we can finalize the next steps."
            ]
        elif tone == "Boundary-Setting":
            replies = [
                "Thank you for reaching out. I'm currently fully committed to a project and won't be able to take this on, but I appreciate you thinking of me.",
                "I'd love to help, but my schedule is at capacity right now. I can review this starting next Tuesday if that works for you?",
                "I need to log off for the day to recharge, but I will review this first thing in the morning and get back to you."
            ]
        elif tone == "Confident":
            replies = [
                "I'm fully confident we can resolve this. Let's schedule 10 minutes tomorrow to align on the action plan.",
                "I've got this covered completely. I'll make the final decision and share the results with you.",
                "Thanks for the trust. I'm moving forward with this approach and will keep you posted on our milestones."
            ]
        else: # Friendly / Supportive
            replies = [
                "Awesome, thank you! Let me know if you need anything at all, happy to help.",
                "Sounds perfect! So excited for this. Let's do it.",
                "Totally agree. You're doing a fantastic job, let's keep it up!"
            ]
            
        # Adjust length
        if length == "Short":
            replies = [r.split(".")[0] + "." for r in replies]
        elif length == "Long":
            suffix_map = {
                "Calm Therapist": " Take a deep breath and take it one step at a time.",
                "Best Friend": " Seriously, don't sweat it. We've got this!",
                "Productivity Mentor": " Let's focus on execution and keep driving results.",
                "Confidence Builder": " You are fully equipped to handle this successfully.",
                "Logical Analyst": " This keeps the message clear and evidence-based.",
                "Decision Coach": " This resolves the open loop without adding friction.",
                "Tough Love Coach": " This is direct enough to stop the spiral.",
                "Social Coach": " This protects the relationship while staying clear.",
                "Career Mentor": " This keeps your professional positioning strong."
            }
            suffix = suffix_map.get(personality, "")
            replies = [r + suffix for r in replies]

        # Tweak suggestions to set firmer boundaries if burnout is high
        if user_context and user_context.get("recent_burnout_score", 0) > 60:
            if tone != "Boundary-Setting":
                replies.append("I need to focus on resting today, but I will get back to you once my capacity allows.")
            
        return {"suggested_replies": replies[:3]}

    def _local_simulator_fallback(self, scenario: str, custom_text: str, personality: str, user_context: Optional[dict]) -> dict:
        personality = self._normalize_persona(personality)
        best = "They will appreciate your vulnerability and honesty, leading to a much deeper level of trust and a sigh of relief on both sides."
        worst = "If you over-explain or sound overly defensive, it might trigger a defensive feedback loop where they feel they have to debate the facts."
        safer = "I wanted to reach out and speak directly. I value our relationship, and I want to make sure we're on the same page. Let me know when is a good time to chat."
        analysis = "Your desire to handle this directly shows great emotional maturity. You are choosing connection over avoidance."
        
        # Scenario adjustments
        scen = scenario.lower()
        if "apology" in scen or "sorry" in scen:
            best = "Acknowledging the mistake directly will instantly defuse any tension. They will respect your courage and integrity."
            worst = "Adding 'but' or explaining why you did it will make the apology sound hollow and might restart the original argument."
            safer = "I've been reflecting on what happened, and I want to sincerely apologize for my part in it. I value our friendship and want to make things right."
            analysis = "Apologizing is not a sign of weakness; it is a sign of high emotional intelligence and relational strength."
        elif "work" in scen or "deadline" in scen or "boss" in scen:
            best = "By presenting the request early alongside a clear progress plan, your manager will view you as highly responsible and organized."
            worst = "Waiting until the last minute or making it sound like you can't cope will trigger concerns about task management."
            safer = "I am fully committed to delivering high-quality work on this project. To ensure it meets our standards, I need to adjust my timeline slightly. I can deliver the final draft by Friday."
            analysis = "Setting professional boundaries protects the quality of your output. It shows you take your work seriously."
            
        # Customize tone to active personality
        if personality == "Best Friend":
            safer = "Hey, just wanted to check in. I'm super sorry about how things went down. Let's grab food and talk it out?"
            analysis = "Honestly, you're being a really good friend by sorting this out. Don't stress too much, they will totally understand!"
        elif personality == "Productivity Mentor":
            safer = "Let's align on this task. To hit our milestones, I need to re-allocate resources. Here is my proposed timeline."
            analysis = "Excellent initiative. You are proactively managing bottlenecks rather than reacting to failures. Keep executing."
        elif personality == "Tough Love Coach":
            safer = "I want to address this directly instead of letting it sit between us. Here is what I own, and here is what I need going forward."
            analysis = "Do not dodge the conversation. Be clean, specific, and respectful."
        elif personality == "Career Mentor":
            safer = "I want to align expectations and protect the quality of the work. Here is the current status, the risk I see, and my proposed next step."
            analysis = "This frames you as proactive and accountable while preserving professional trust."

        # Burnout-based simulation modification
        if user_context and user_context.get("recent_burnout_score", 0) > 60:
            analysis += " Note: Your burnout score is currently elevated. Do not rush this conversation if you feel depleted; wait until you have recharged."
            
        return {
            "best_case_reaction": best,
            "worst_case_reaction": worst,
            "safer_wording": safer,
            "confidence_analysis": analysis
        }

    def _local_journal_fallback(self, entry_text: str, personality: str, user_context: Optional[dict]) -> dict:
        personality = self._normalize_persona(personality)
        text_lower = entry_text.lower()
        
        # Analyze mood and triggers
        mood = "Calm"
        triggers = "daily routine, work, rest"
        summary = "You've written down your thoughts, which is an excellent step. Venting is a very healthy way to discharge cognitive load."
        
        anxious_words = ["anxious", "worry", "stress", "scared", "afraid", "overwhelmed", "nervous"]
        exhausted_words = ["tired", "exhausted", "sleepy", "burnout", "drained", "heavy", "fatigue"]
        happy_words = ["happy", "excited", "glad", "awesome", "great", "proud", "fun"]
        
        if any(w in text_lower for w in anxious_words):
            mood = "Anxiety"
            triggers = "overthinking, uncertainties, expectations"
            if personality == "Calm Therapist":
                summary = "I hear a lot of anxiety and heavy expectations in your words. Please remind yourself that you do not need to figure out everything today. Give yourself permission to be incomplete."
            elif personality == "Best Friend":
                summary = "Oh no, sounds like your brain is in absolute overdrive today! Take a deep breath. You are doing so much better than you give yourself credit for. Let's shake it off!"
        elif any(w in text_lower for w in exhausted_words):
            mood = "Burnout"
            triggers = "overwork, sleep deficit, high mental load"
            if personality == "Calm Therapist":
                summary = "You are running on empty. This exhaustion is your body's way of asking for a sacred pause. Rest is not something you earn; it is a basic human necessity."
            elif personality == "Productivity Mentor":
                summary = "Your energy levels are critically low, which directly impacts your decision-making capacity. We need to implement an immediate cognitive shutdown: cancel non-essentials and recover."
        elif any(w in text_lower for w in happy_words):
            mood = "Excitement"
            triggers = "positive achievements, social connection, focus"
            summary = "What a wonderful, high-energy entry! Celebrate this moment. Capture this feeling in your body so you can recall it during tougher times."

        if user_context:
            recent_moods = user_context.get("recent_moods", [])
            # If they have been consistently anxious, tailor the feedback
            if recent_moods.count("Anxiety") >= 3:
                summary += " Note: Your journals show a persistent anxiety pattern. Consider talking to a trusted friend or professional to unpack this weight."
            
        return {
            "primary_mood": mood,
            "worry_triggers": triggers,
            "ai_summary": summary
        }
