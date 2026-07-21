"use client";

import React, { Suspense, lazy, useMemo, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import GlassSidebar from "../components/GlassSidebar";
import LoginView from "../components/LoginView";
import { Bell } from "lucide-react";

// Lazy load all heavy view components — each splits into its own chunk
const DashboardView = lazy(() => import("../components/DashboardView"));
const TranslatorView = lazy(() => import("../components/TranslatorView"));
const ReplyGeneratorView = lazy(() => import("../components/ReplyGeneratorView"));
const DecisionEngineView = lazy(() => import("../components/DecisionEngineView"));
const JournalView = lazy(() => import("../components/JournalView"));
const SocialConfidenceView = lazy(() => import("../components/SocialConfidenceView"));
const BurnoutView = lazy(() => import("../components/BurnoutView"));

// Minimal fallback shown while a lazy chunk loads
const ViewFallback = () => (
  <div className="w-full h-64 flex items-center justify-center">
    <span className="font-mono text-[9px] uppercase tracking-widest text-[#575653] animate-pulse">
      Loading module...
    </span>
  </div>
);

export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const activeTab = useAppStore((s) => s.activeTab);
  const activePersonality = useAppStore((s) => s.activePersonality);
  const notifications = useAppStore((s) => s.notifications);
  const clearNotification = useAppStore((s) => s.clearNotification);

  const [authChecked, setAuthChecked] = React.useState(false);

  // Restore session once on mount — login/restoreSession already fires all data fetches
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await useAppStore.getState().restoreSession();
      } catch (error) {
        console.error("Session restore failed:", error);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Memoize theme class — only recomputes when activePersonality changes
  const themeClass = useMemo(() => {
    switch (activePersonality) {
      case "Calm Therapist":      return "theme-therapist";
      case "Best Friend":         return "theme-friend";
      case "Logical Analyst":     return "theme-analyst";
      case "Decision Coach":      return "theme-decision";
      case "Confidence Builder":  return "theme-mentor";
      case "Productivity Mentor": return "theme-coach";
      case "Tough Love Coach":    return "theme-tough";
      case "Social Coach":        return "theme-social";
      case "Career Mentor":       return "theme-career";
      case "Adaptive Companion":  return "theme-adaptive";
      default:                    return "theme-therapist";
    }
  }, [activePersonality]);

  // Memoize the active view renderer — only changes when activeTab changes
  const activeView = useMemo(() => {
    switch (activeTab) {
      case "dashboard":  return <DashboardView />;
      case "translator": return <TranslatorView />;
      case "replies":    return <ReplyGeneratorView />;
      case "decisions":  return <DecisionEngineView />;
      case "journal":    return <JournalView />;
      case "social":     return <SocialConfidenceView />;
      case "burnout":    return <BurnoutView />;
      default:           return <DashboardView />;
    }
  }, [activeTab]);

  const handleDismiss = useCallback(
    (id: string) => clearNotification(id),
    [clearNotification]
  );

  // Neutral loading state while session restoration is in flight
  if (!authChecked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#070708] text-[#f2efea]">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#575653] animate-pulse">
          Restoring session...
        </span>
      </div>
    );
  }

  // Unauthenticated → show Login/Signup
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className={`min-h-screen relative flex bg-[#070708] text-[#f2efea] overflow-hidden ${themeClass}`}>

      {/* Editorial Grid Underlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none border-x border-[#1d1d1f] mx-auto max-w-[1600px] flex justify-between">
        <div className="w-[1px] h-full bg-[#1d1d1f] ml-80" />
        <div className="w-[1px] h-full bg-[#1d1d1f] hidden lg:block" />
        <div className="w-[1px] h-full bg-[#1d1d1f] hidden xl:block" />
      </div>

      {/* Navigation Left Sidebar */}
      <GlassSidebar />

      {/* Primary Right Workspaces Console */}
      <div className="flex-1 h-screen flex flex-col overflow-hidden relative z-10">

        {/* Editorial Top Header */}
        <header className="w-full h-16 px-8 flex items-center justify-between border-b border-[#1d1d1f] bg-[#070708] shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[#ff3300]" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e]">
              Sanctuary Node Status: ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#eae6df] bg-[#141416] border border-[#1d1d1f] px-3 py-1">
              FOCUS MODE // {activePersonality}
            </span>
          </div>
        </header>

        {/* Inner View frame container */}
        <main className="flex-1 overflow-y-auto px-8 py-10 flex justify-center">
          <div className="w-full max-w-[1400px] animate-slide-reveal pb-16">
            <Suspense fallback={<ViewFallback />}>
              {activeView}
            </Suspense>
          </div>
        </main>

      </div>

      {/* Notification stack */}
      <div className="fixed bottom-8 right-8 z-50 space-y-2 max-w-sm pointer-events-auto">
        {notifications.map((notif) => {
          const isWarning = notif.type === "warning" || notif.type === "cognitive";
          return (
            <div
              key={notif.id}
              onClick={() => handleDismiss(notif.id)}
              className={`p-4 border transition-all duration-200 cursor-pointer shadow-none flex items-start gap-3 bg-[#0d0d0e] ${
                isWarning
                  ? "border-[#ff3300]/60 text-[#ff3300]"
                  : "border-[#1d1d1f] text-[#f2efea]"
              }`}
            >
              <div className="w-6 h-6 border border-[#2d2d30] flex items-center justify-center shrink-0">
                <Bell size={12} className={isWarning ? "text-[#ff3300]" : "text-[#93928e]"} />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[10px] font-bold leading-normal uppercase">
                  {notif.message}
                </p>
                <span className="font-mono text-[8px] text-[#575653] block">
                  {notif.time} // CLICK TO DISMISS
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
