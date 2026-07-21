import { create } from "zustand";
import { postSseStream } from "../lib/sseClient";

export interface User {
  id: number;
  username: string;
  active_personality: string;
}

export interface Journal {
  id: number;
  user_id: number;
  entry_text: string;
  voice_url?: string;
  primary_mood: string;
  worry_triggers?: string;
  ai_summary?: string;
  created_at: string;
}

export interface Decision {
  id: number;
  user_id: number;
  title: string;
  category: string;
  priority: number;
  difficulty: number;
  optimal_time?: string;
  status: string;
  created_at: string;
}

export interface BurnoutLog {
  id: number;
  user_id: number;
  score: number;
  stress_level: string;
  active_hours: number;
  sleep_hours: number;
  recommendation: string;
  created_at: string;
}

export interface ScheduleItem {
  decision_id: number;
  title: string;
  time_slot: string;
  category: string;
  icon: string;
  energy_bracket: string;
  suggestion: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: "info" | "warning" | "success" | "cognitive";
  time: string;
}

export interface AIRuntimeStatus {
  enabled: boolean;
  providers?: Array<{ name: string; model: string }>;
  primary_provider: string;
  backup_provider?: string | null;
  active_provider: string;
  active_model: string;
  last_success_provider?: string | null;
  last_success_model?: string | null;
  last_error?: string | null;
  voice?: {
    enabled: boolean;
    provider: string;
    model: string;
  };
}

type Persona =
  | "Calm Therapist"
  | "Best Friend"
  | "Logical Analyst"
  | "Decision Coach"
  | "Confidence Builder"
  | "Productivity Mentor"
  | "Tough Love Coach"
  | "Social Coach"
  | "Career Mentor"
  | "Adaptive Companion";

const readStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("mindease_user");
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem("mindease_user");
    return null;
  }
};

const readStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mindease_token");
};

const inflightRequests = new Set<string>();
let mentalLoadAlertShown = false;

const runDeduped = async (key: string, task: () => Promise<void>) => {
  if (inflightRequests.has(key)) return;
  inflightRequests.add(key);
  try {
    await task();
  } finally {
    inflightRequests.delete(key);
  }
};

const loadSessionData = (get: () => AppState) => {
  void Promise.all([
    get().fetchDashboardData(),
    get().fetchAIRuntime(),
    get().fetchJournals(),
    get().fetchDecisions(),
    get().fetchBurnoutHistory(),
  ]).catch(() => {});
};

const normalizePersona = (value?: string | null): Persona => {
  const aliases: Record<string, Persona> = {
    "Smart Best Friend": "Best Friend",
    "Productivity Coach": "Productivity Mentor",
    "Motivational Mentor": "Confidence Builder",
    "Minimal Assistant": "Decision Coach",
    "Analytical Advisor": "Logical Analyst",
    "Compassionate Listener": "Calm Therapist",
    "Pragmatic Advisor": "Decision Coach",
    "Emotional Nurturer": "Confidence Builder",
  };
  const personas: Persona[] = [
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
  ];
  if (value && aliases[value]) return aliases[value];
  if (value && personas.includes(value as Persona)) return value as Persona;
  return "Calm Therapist";
};

interface AppState {
  // Auth State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // UI & Active Tabs
  activeTab: "dashboard" | "translator" | "replies" | "decisions" | "journal" | "social" | "burnout";
  activePersonality: Persona;
  
  // Cognitive Metrics
  mentalLoadScore: number;
  decisionPressureMeter: number;
  
  // Content Caches
  journals: Journal[];
  decisions: Decision[];
  burnoutHistory: BurnoutLog[];
  optimizedSchedule: ScheduleItem[];
  personalityAdvice: string;
  
  // AI Feature States
  translationResult: any | null;
  repliesResult: string[] | null;
  simulationResult: any | null;
  translationStreamText: string;
  repliesStreamText: string;
  simulationStreamText: string;
  isAILoading: boolean;
  isVoiceTranscribing: boolean;
  aiAbortController: AbortController | null;
  
  // Soundscapes State
  isSoundPlaying: boolean;
  activeSoundTrack: "lofi" | "rain" | "ocean";
  
  // Notifications
  notifications: AppNotification[];
  aiRuntime: AIRuntimeStatus | null;
  
  // Config
  apiBaseUrl: string;

  // Actions
  setToken: (token: string | null, user: User | null) => void;
  setActiveTab: (tab: AppState["activeTab"]) => void;
  setPersonality: (personality: AppState["activePersonality"]) => Promise<void>;
  toggleSound: () => void;
  setSoundTrack: (track: AppState["activeSoundTrack"]) => void;
  addNotification: (message: string, type?: AppNotification["type"]) => void;
  clearNotification: (id: string) => void;
  
  // API Fetch actions
  fetchDashboardData: () => Promise<void>;
  fetchAIRuntime: () => Promise<void>;
  fetchJournals: () => Promise<void>;
  fetchDecisions: () => Promise<void>;
  fetchBurnoutHistory: () => Promise<void>;
  
  // Form submission wrappers
  register: (username: string, password: string) => Promise<boolean>;
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  savePreferences: (payload?: Record<string, unknown>) => Promise<void>;
  submitJournal: (text: string, mood: string) => Promise<void>;
  submitDecision: (title: string, category: string, priority: number, difficulty: number) => Promise<void>;
  updateDecisionStatus: (id: number, status: string) => Promise<void>;
  runScheduleOptimizer: () => Promise<void>;
  submitBurnoutAssessment: (active: number, sleep: number, exhausted: boolean, anxious: boolean, skippedBreaks: boolean) => Promise<void>;
  translateOverthinking: (message: string, context?: string) => Promise<void>;
  generateToneReplies: (message: string, tone: string, length: string) => Promise<void>;
  simulateSocialDilemma: (scenario: string, customText?: string) => Promise<void>;
  cancelAIStream: () => void;
  transcribeVoice: (audio: Blob) => Promise<string | null>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Defaults
  user: readStoredUser(),
  token: readStoredToken(),
  isAuthenticated: typeof window !== "undefined" ? !!readStoredToken() : false,
  activeTab: "dashboard",
  activePersonality: readStoredUser()
    ? normalizePersona(readStoredUser()?.active_personality)
    : "Calm Therapist",
  mentalLoadScore: 25,
  decisionPressureMeter: 20,
  journals: [],
  decisions: [],
  burnoutHistory: [],
  optimizedSchedule: [],
  personalityAdvice: "Breathe. I'm here to help you navigate your day with absolute peace.",
  translationResult: null,
  repliesResult: null,
  simulationResult: null,
  translationStreamText: "",
  repliesStreamText: "",
  simulationStreamText: "",
  isAILoading: false,
  isVoiceTranscribing: false,
  aiAbortController: null,
  isSoundPlaying: false,
  activeSoundTrack: "lofi",
  notifications: [
    {
      id: "init",
      message: "MindEase AI active. Welcome back to your cognitive sanctuary.",
      type: "info",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ],
  aiRuntime: null,
  apiBaseUrl: "https://mindease-ai-yezs.onrender.com",

  // Simple State Mutators
  setToken: (token, user) => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("mindease_token", token);
        localStorage.setItem("mindease_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("mindease_token");
        localStorage.removeItem("mindease_user");
      }
    }
    set({ token, user, isAuthenticated: !!token });
  },
  setActiveTab: (activeTab) => {
    set({ activeTab });
    // Preference sync is handled on logout/beforeunload, not on every tab click
  },
  toggleSound: () => set((state) => ({ isSoundPlaying: !state.isSoundPlaying })),
  setSoundTrack: (activeSoundTrack) => set({ activeSoundTrack }),
  
  addNotification: (message, type = "info") => {
    const newNotif: AppNotification = {
      id: Math.random().toString(),
      message,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications.slice(0, 4)] // Cap at 5 notifications
    }));
  },
  
  clearNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  // API Authentication Async Calls
  register: async (username, password) => {
    try {
      const response = await fetch(`${get().apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Server error" }));
        const message = err.detail || "Registration failed.";
        if (response.status === 400) {
          throw new Error(message);
        } else if (response.status === 409) {
          throw new Error("Username already exists.");
        } else if (response.status >= 500) {
          throw new Error("Server error. Please try again later.");
        }
        throw new Error(message);
      }
      get().addNotification("Account created successfully! Redirecting to login...", "success");
      return true;
    } catch (e: any) {
      const errorMsg = e.message || "Network error. Please check your connection.";
      get().addNotification(errorMsg, "warning");
      return false;
    }
  },

  login: async (username, password, remember = false) => {
    try {
      const response = await fetch(`${get().apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, remember })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Server error" }));
        const message = err.detail || "Login failed.";
        if (response.status === 404) {
          throw new Error("User not found. Please check your username.");
        } else if (response.status === 401) {
          throw new Error("Invalid password.");
        } else if (response.status === 429) {
          throw new Error("Too many login attempts. Please try again in 10 minutes.");
        } else if (response.status >= 500) {
          throw new Error("Server error. Please try again later.");
        }
        throw new Error(message);
      }
      const data = await response.json();
      
      if (typeof window !== "undefined") {
        localStorage.setItem("mindease_token", data.access_token);
        localStorage.setItem("mindease_user", JSON.stringify(data.user));
      }

      set({
        token: data.access_token,
        user: data.user,
        activePersonality: normalizePersona(data.user.active_personality),
        isAuthenticated: true
      });
      
      get().addNotification(`Access granted. Welcome back, ${data.user.username}!`, "success");

      loadSessionData(get);
      void get().savePreferences().catch(() => {});
      return true;
    } catch (e: any) {
      const errorMsg = e.message || "Network error. Please check your connection.";
      get().addNotification(errorMsg, "warning");
      return false;
    }
  },

  logout: async () => {
    try {
      await fetch(`${get().apiBaseUrl}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch (e) {
      console.warn("Logout request failed, clearing local session anyway.", e);
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("mindease_token");
      localStorage.removeItem("mindease_user");
    }
    mentalLoadAlertShown = false;
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      journals: [],
      decisions: [],
      optimizedSchedule: [],
      burnoutHistory: []
    });
    get().addNotification("Logged out from cognitive operating system.", "info");
  },

  savePreferences: async (payload = {}) => {
    const token = get().token;
    if (!token) return;
    try {
      await fetch(`${get().apiBaseUrl}/api/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          active_tab: get().activeTab,
          dashboard_state: {
            mentalLoadScore: get().mentalLoadScore,
            decisionPressureMeter: get().decisionPressureMeter,
            activeSoundTrack: get().activeSoundTrack,
          },
          settings: {
            soundPlaying: get().isSoundPlaying,
          },
          ...payload,
        }),
      });
    } catch (e) {
      console.warn("Preference sync failed:", e);
    }
  },

  setPersonality: async (personality) => {
    const token = get().token;
    if (!token) return;
    
    const oldPersonality = get().activePersonality;
    // Optimistic UI updates color scheme instantly
    set({ activePersonality: personality });
    
    try {
      const response = await fetch(`${get().apiBaseUrl}/api/auth/personality`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ personality })
      });
      if (response.ok) {
        const user = await response.json();
        if (typeof window !== "undefined") {
          localStorage.setItem("mindease_user", JSON.stringify(user));
        }
        set({ user });
        get().addNotification(`Companion voice mapped to ${personality}.`, "info");
        await get().runScheduleOptimizer(); // Reload dashboard tips for new personality
      } else {
        throw new Error("Failed to save personality on server.");
      }
    } catch (e) {
      set({ activePersonality: oldPersonality });
      console.error("Failed to commit personality update to backend:", e);
      get().addNotification("Failed to save personality settings. Rollback activated.", "warning");
    }
  },

  // Session restore: tries /me then /refresh cookie endpoint with timeout
  restoreSession: async () => {
    const apiBase = get().apiBaseUrl;
    const timeout = 5000;

    const clearStaleSession = () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("mindease_token");
        localStorage.removeItem("mindease_user");
      }
      set({ user: null, token: null, isAuthenticated: false });
    };

    try {
      const token = get().token || readStoredToken();
      if (token) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const resp = await fetch(`${apiBase}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (resp.ok) {
            const user = await resp.json();
            set({
              user,
              isAuthenticated: true,
              activePersonality: normalizePersona(user.active_personality),
              token,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("mindease_user", JSON.stringify(user));
            }
            loadSessionData(get);
            return true;
          }

          if (resp.status === 401) {
            clearStaleSession();
          }
        } catch (e: unknown) {
          if (e instanceof Error && e.name !== "AbortError") {
            console.warn("Token validation failed, attempting refresh...");
          }
        }
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const refreshResp = await fetch(`${apiBase}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (refreshResp.ok) {
          const data = await refreshResp.json();
          if (typeof window !== "undefined") {
            localStorage.setItem("mindease_token", data.access_token);
            localStorage.setItem("mindease_user", JSON.stringify(data.user));
          }
          set({
            token: data.access_token,
            user: data.user,
            isAuthenticated: true,
            activePersonality: normalizePersona(data.user.active_personality),
          });
          loadSessionData(get);
          return true;
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") {
          console.warn("Cookie refresh failed");
        }
      }

      if (get().isAuthenticated && !get().token) {
        clearStaleSession();
      }
      return false;
    } catch (e) {
      console.error("Session restore error:", e);
      return false;
    }
  },

  // API Content Loaders
  fetchAIRuntime: async () => {
    const token = get().token;
    if (!token) return;
    await runDeduped("ai-runtime", async () => {
      try {
        const response = await fetch(`${get().apiBaseUrl}/api/ai/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const aiRuntime = await response.json();
          set({ aiRuntime });
        }
      } catch (e) {
        console.error(e);
      }
    });
  },

  fetchDashboardData: async () => {
    const token = get().token;
    if (!token) return;
    await runDeduped("dashboard", async () => {
      try {
        const response = await fetch(`${get().apiBaseUrl}/api/decisions/optimize`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          set({
            mentalLoadScore: data.mental_load_score,
            decisionPressureMeter: data.decision_pressure_meter,
            optimizedSchedule: data.ai_optimized_schedule,
            personalityAdvice: data.personality_advice,
          });

          if (data.mental_load_score > 70 && !mentalLoadAlertShown) {
            mentalLoadAlertShown = true;
            get().addNotification(
              "Your Mental Load Score is highly elevated. Want help simplifying your schedule?",
              "cognitive"
            );
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
  },

  fetchJournals: async () => {
    const token = get().token;
    if (!token) return;
    await runDeduped("journals", async () => {
      try {
        const response = await fetch(`${get().apiBaseUrl}/api/journal/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const journals = await response.json();
          set({ journals });
        }
      } catch (e) {
        console.error(e);
      }
    });
  },

  fetchDecisions: async () => {
    const token = get().token;
    if (!token) return;
    await runDeduped("decisions", async () => {
      try {
        const response = await fetch(`${get().apiBaseUrl}/api/decisions/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const decisions = await response.json();
          set({ decisions });
        }
      } catch (e) {
        console.error(e);
      }
    });
  },

  fetchBurnoutHistory: async () => {
    const token = get().token;
    if (!token) return;
    await runDeduped("burnout", async () => {
      try {
        const response = await fetch(`${get().apiBaseUrl}/api/burnout/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const history = await response.json();
          set({ burnoutHistory: history });
        }
      } catch (e) {
        console.error(e);
      }
    });
  },

  // API Mutating Actions
  submitJournal: async (text, mood) => {
    const token = get().token;
    if (!token) return;
    set({ isAILoading: true });
    try {
      const response = await fetch(`${get().apiBaseUrl}/api/journal/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ entry_text: text, primary_mood: mood })
      });
      if (response.ok) {
        get().addNotification("Journal entry committed to cognitive records.", "success");
        await get().fetchJournals();
        await get().fetchDashboardData(); // Recalculate load scores
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isAILoading: false });
    }
  },

  submitDecision: async (title, category, priority, difficulty) => {
    const token = get().token;
    if (!token) return;
    try {
      const response = await fetch(`${get().apiBaseUrl}/api/decisions/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, category, priority, difficulty })
      });
      if (response.ok) {
        get().addNotification("Cognitive burden logged. Ready for optimization.", "info");
        await get().fetchDecisions();
        await get().fetchDashboardData(); // Recalculate schedule instantly!
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateDecisionStatus: async (id, status) => {
    const token = get().token;
    if (!token) return;
    try {
      const response = await fetch(`${get().apiBaseUrl}/api/decisions/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        get().addNotification(status === "Done" ? "Decision resolved. Cognitive load released." : "Decision deferred.", "success");
        await get().fetchDecisions();
        await get().fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  },

  runScheduleOptimizer: async () => {
    await get().fetchDashboardData();
    get().addNotification("Schedule optimized. today's cognitive pressure minimized.", "success");
  },

  submitBurnoutAssessment: async (active, sleep, exhausted, anxious, skippedBreaks) => {
    const token = get().token;
    if (!token) return;
    try {
      const response = await fetch(`${get().apiBaseUrl}/api/burnout/assess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          active_hours: active,
          sleep_hours: sleep,
          felt_exhausted: exhausted,
          anxious_today: anxious,
          skipped_breaks: skippedBreaks
        })
      });
      if (response.ok) {
        const data = await response.json();
        get().addNotification(`Burnout Assessment complete. Status: ${data.stress_level} Fatigue.`, data.score > 60 ? "warning" : "success");
        await get().fetchBurnoutHistory();
        await get().fetchDashboardData(); // Recalculate global scores
      }
    } catch (e) {
      console.error(e);
    }
  },

  // AI Feature triggers
  cancelAIStream: () => {
    const controller = get().aiAbortController;
    if (controller) controller.abort();
    set({ aiAbortController: null, isAILoading: false });
  },

  transcribeVoice: async (audio) => {
    const token = get().token;
    if (!token) return null;
    set({ isVoiceTranscribing: true });
    try {
      const form = new FormData();
      form.append("audio_file", audio, "recording.webm");
      const response = await fetch(`${get().apiBaseUrl}/api/voice/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Voice transcription failed.");
      }
      const data = await response.json();
      return data.transcript as string;
    } catch (e: any) {
      get().addNotification(e.message || "Could not transcribe audio.", "warning");
      return null;
    } finally {
      set({ isVoiceTranscribing: false });
    }
  },

  translateOverthinking: async (message, context = "") => {
    const token = get().token;
    if (!token) return;
    get().aiAbortController?.abort();
    const controller = new AbortController();
    set({
      isAILoading: true,
      translationResult: null,
      translationStreamText: "",
      aiAbortController: controller,
    });
    try {
      // RAF-batched delta accumulator — flushes on next animation frame instead of per token
      let pendingDelta = "";
      let rafId: number | null = null;
      const flushDelta = () => {
        if (pendingDelta) {
          const chunk = pendingDelta;
          pendingDelta = "";
          set((state) => ({ translationStreamText: state.translationStreamText + chunk }));
        }
        rafId = null;
      };
      await postSseStream<any>(
        `${get().apiBaseUrl}/api/ai/translate/stream`,
        token,
        { message, context },
        {
          onDelta: (text) => {
            pendingDelta += text;
            if (!rafId) rafId = requestAnimationFrame(flushDelta);
          },
          onDone: (result) => {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            set({ translationResult: result, translationStreamText: "" });
            get().addNotification("Analysis ready.", "success");
          },
          onError: (msg) => get().addNotification(msg, "warning"),
        },
        controller.signal
      );
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      set({ isAILoading: false, aiAbortController: null });
    }
  },

  generateToneReplies: async (message, tone, length) => {
    const token = get().token;
    if (!token) return;
    get().aiAbortController?.abort();
    const controller = new AbortController();
    set({
      isAILoading: true,
      repliesResult: null,
      repliesStreamText: "",
      aiAbortController: controller,
    });
    try {
      let pendingDelta = "";
      let rafId: number | null = null;
      const flushDelta = () => {
        if (pendingDelta) {
          const chunk = pendingDelta;
          pendingDelta = "";
          set((state) => ({ repliesStreamText: state.repliesStreamText + chunk }));
        }
        rafId = null;
      };
      await postSseStream<{ suggested_replies: string[] }>(
        `${get().apiBaseUrl}/api/ai/replies/stream`,
        token,
        { message, tone, length },
        {
          onDelta: (text) => {
            pendingDelta += text;
            if (!rafId) rafId = requestAnimationFrame(flushDelta);
          },
          onDone: (result) => {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            set({ repliesResult: result.suggested_replies, repliesStreamText: "" });
            get().addNotification(`Three ${tone.toLowerCase()} replies are ready.`, "success");
          },
          onError: (msg) => get().addNotification(msg, "warning"),
        },
        controller.signal
      );
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      set({ isAILoading: false, aiAbortController: null });
    }
  },

  simulateSocialDilemma: async (scenario, customText = "") => {
    const token = get().token;
    if (!token) return;
    get().aiAbortController?.abort();
    const controller = new AbortController();
    set({
      isAILoading: true,
      simulationResult: null,
      simulationStreamText: "",
      aiAbortController: controller,
    });
    try {
      let pendingDelta = "";
      let rafId: number | null = null;
      const flushDelta = () => {
        if (pendingDelta) {
          const chunk = pendingDelta;
          pendingDelta = "";
          set((state) => ({ simulationStreamText: state.simulationStreamText + chunk }));
        }
        rafId = null;
      };
      await postSseStream<any>(
        `${get().apiBaseUrl}/api/ai/simulate/stream`,
        token,
        { scenario, custom_text: customText },
        {
          onDelta: (text) => {
            pendingDelta += text;
            if (!rafId) rafId = requestAnimationFrame(flushDelta);
          },
          onDone: (result) => {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            set({ simulationResult: result, simulationStreamText: "" });
            get().addNotification("Simulation complete.", "success");
          },
          onError: (msg) => get().addNotification(msg, "warning"),
        },
        controller.signal
      );
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      set({ isAILoading: false, aiAbortController: null });
    }
  }
}));
