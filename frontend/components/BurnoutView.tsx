"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


export default function BurnoutView() {
  const submitBurnoutAssessment = useAppStore((s) => s.submitBurnoutAssessment);
  const burnoutHistory = useAppStore((s) => s.burnoutHistory);
  const activePersonality = useAppStore((s) => s.activePersonality);
  
  // Assessment coordinates
  const [activeHours, setActiveHours] = useState(8);
  const [sleepHours, setSleepHours] = useState(7);
  const [feltExhausted, setFeltExhausted] = useState(false);
  const [anxiousToday, setAnxiousToday] = useState(false);
  const [skippedBreaks, setSkippedBreaks] = useState(false);

  // Breathing Guide State
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [breathSeconds, setBreathSeconds] = useState(0);

  // Detox Timer State
  const [detoxActive, setDetoxActive] = useState(false);
  const [detoxSeconds, setDetoxSeconds] = useState(25 * 60);

  // 4-7-8 breathing loop orchestrator
  useEffect(() => {
    if (!breathingActive) {
      setBreathPhase("idle");
      setBreathSeconds(0);
      return;
    }

    setBreathPhase("inhale");
    setBreathSeconds(4);

    let currentPhase: "inhale" | "hold" | "exhale" = "inhale";
    let timeLeft = 4;

    const interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        if (currentPhase === "inhale") {
          currentPhase = "hold";
          timeLeft = 7;
        } else if (currentPhase === "hold") {
          currentPhase = "exhale";
          timeLeft = 8;
        } else {
          currentPhase = "inhale";
          timeLeft = 4;
        }
        setBreathPhase(currentPhase);
      }
      setBreathSeconds(timeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [breathingActive]);

  // Detox Timer loop
  useEffect(() => {
    if (!detoxActive) return;

    const timer = setInterval(() => {
      setDetoxSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setDetoxActive(false);
          window.setTimeout(() => {
            alert("Digital Detox complete. Welcome back, refreshed.");
          }, 0);
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [detoxActive]);

  const handleAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    submitBurnoutAssessment(activeHours, sleepHours, feltExhausted, anxiousToday, skippedBreaks);
  };

  const getPhasePrompt = () => {
    switch (breathPhase) {
      case "inhale": return "BREATHE IN DEEPLY THROUGH NOSE // EXPAND LUNGS";
      case "hold": return "RETAIN AIR IN LUNGS // HOLD STEADY";
      case "exhale": return "RELEASE SLOWLY THROUGH MOUTH // AUDIBLE WHOOSH";
      case "idle":
      default:
        return "RESPIRATORY TIMING ASSISTANT PROTOCOL";
    }
  };

  const getBreathBar = () => {
    if (!breathingActive) return "[ ] IDLE SYSTEM";
    let progress = 0;
    if (breathPhase === "inhale") {
      progress = ((4 - breathSeconds) / 4) * 10;
    } else if (breathPhase === "hold") {
      progress = 10;
    } else if (breathPhase === "exhale") {
      progress = (breathSeconds / 8) * 10;
    }
    const blocks = "█".repeat(Math.round(progress));
    const spaces = "░".repeat(10 - Math.round(progress));
    return `[${blocks}${spaces}] ${breathSeconds}s // ${breathPhase.toUpperCase()}`;
  };

  const formatDetoxTime = () => {
    const mins = Math.floor(detoxSeconds / 60);
    const secs = detoxSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const latestLog = burnoutHistory[burnoutHistory.length - 1];

  return (
    <div className="w-full space-y-12">
      
      {/* Module Title */}
      <div className="border-b border-[#1d1d1f] pb-8">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ff3300] block mb-2 font-bold">COGNITIVE WEAR & TEAR ENGINE</span>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tighter uppercase font-sans text-[#f2efea]">BURNOUT & FATIGUE MONITOR</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] mt-3">
          LOG WORKLOAD PARAMETERS, EVALUATE CRITICAL EXHAUSTION COEFFICIENTS, AND ACTIVATE IMMEDIATE SENSORY-DETOX PROTOCOLS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        
        {/* Logger form */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-5 sm:p-8 space-y-6">
          <div className="border-b border-[#1d1d1f] pb-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">DAILY WORKLOAD COEFFICIENTS</span>
          </div>

          <form onSubmit={handleAssessment} className="space-y-6">
            
            {/* Active hours slider */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-[9px] text-[#93928e]">
                <label className="uppercase">ACTIVE HIGH-COGNITIVE HOURS</label>
                <span className="text-[#ff3300] font-bold">{activeHours} HRS</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.5"
                value={activeHours}
                onChange={(e) => setActiveHours(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#2d2d30] appearance-none cursor-pointer accent-[#ff3300]"
              />
            </div>

            {/* Sleep duration slider */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-[9px] text-[#93928e]">
                <label className="uppercase">SLEEP SYSTEM REST HOURS</label>
                <span className="text-[#ff3300] font-bold">{sleepHours} HRS</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#2d2d30] appearance-none cursor-pointer accent-[#ff3300]"
              />
            </div>

            {/* Symptom Indicators */}
            <div className="space-y-2 pt-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">DETECTABLE ANXIETY TRIGGERS</label>
              
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-4 bg-[#070708] border border-[#2d2d30] cursor-pointer hover:border-[#ff3300]/40 transition-colors text-xs font-mono text-[#93928e] uppercase">
                  <input
                    type="checkbox"
                    checked={feltExhausted}
                    onChange={(e) => setFeltExhausted(e.target.checked)}
                    className="w-4 h-4 border-[#2d2d30] text-[#ff3300] focus:ring-0 focus:ring-offset-0 bg-transparent rounded-none"
                  />
                  PHYSICAL/MENTAL DEPLETION PRESENT
                </label>

                <label className="flex items-center gap-3 p-4 bg-[#070708] border border-[#2d2d30] cursor-pointer hover:border-[#ff3300]/40 transition-colors text-xs font-mono text-[#93928e] uppercase">
                  <input
                    type="checkbox"
                    checked={anxiousToday}
                    onChange={(e) => setAnxiousToday(e.target.checked)}
                    className="w-4 h-4 border-[#2d2d30] text-[#ff3300] focus:ring-0 focus:ring-offset-0 bg-transparent rounded-none"
                  />
                  PERSISTENT SUBTEXT ANXIETY ACTIVE
                </label>

                <label className="flex items-center gap-3 p-4 bg-[#070708] border border-[#2d2d30] cursor-pointer hover:border-[#ff3300]/40 transition-colors text-xs font-mono text-[#93928e] uppercase">
                  <input
                    type="checkbox"
                    checked={skippedBreaks}
                    onChange={(e) => setSkippedBreaks(e.target.checked)}
                    className="w-4 h-4 border-[#2d2d30] text-[#ff3300] focus:ring-0 focus:ring-offset-0 bg-transparent rounded-none"
                  />
                  SKIPPED NUTRITIONAL OR REST BREAKS
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#ff3300] hover:bg-[#f2efea] hover:text-[#070708] transition-colors text-xs font-mono tracking-widest uppercase text-[#ffffff] cursor-pointer"
            >
              DIAGNOSE COGNITIVE RESERVES
            </button>
          </form>
        </div>

        {/* Results / recommendations */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 min-h-[30rem] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-[#1d1d1f] pb-4">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block">FATIGUE DIAGNOSTIC STATUS</span>
            </div>

            {!latestLog ? (
              <div className="text-center py-16 space-y-4 my-auto">
                <div className="w-10 h-10 border border-[#2d2d30] flex items-center justify-center mx-auto text-[#575653]">
                  ?
                </div>
                <p className="font-mono text-xs text-[#93928e] uppercase tracking-wider">AWAITING SYSTEM COORDINATES</p>
                <p className="font-mono text-[9px] text-[#575653] max-w-xs mx-auto leading-normal uppercase">
                  INPUT DAILY LOG VALUES TO INITIATE A DIAGNOSTIC RE-CALCULATION.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-slide-reveal">
                <div className="flex justify-between items-center border-b border-[#1d1d1f] pb-4">
                  <div>
                    <span className="font-mono text-[8px] text-[#ff3300] uppercase tracking-widest block font-bold">FATIGUE RATING</span>
                    <h3 className="font-sans font-extrabold text-sm uppercase tracking-wide text-[#f2efea] mt-1">{latestLog.stress_level}</h3>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[8px] text-[#93928e] uppercase block font-bold">BURNOUT INDEX</span>
                    <p className="font-sans text-sm font-extrabold text-[#ff3300] mt-1">{latestLog.score}%</p>
                  </div>
                </div>

                <div className="w-full h-1 bg-[#2d2d30]">
                  <div 
                    className="h-full bg-[#ff3300]"
                    style={{ width: `${latestLog.score}%` }}
                  ></div>
                </div>

                {/* AI Prescription block */}
                <div className="border border-[#ff3300]/20 bg-[#ff3300]/5 p-5 space-y-2 text-xs">
                  <span className="font-mono text-[8px] text-[#ff3300] uppercase tracking-widest block font-bold">
                    // COMPANION REST PRESCRIPTION ({activePersonality.toUpperCase()})
                  </span>
                  <p className="font-sans text-xs text-[#eae6df] leading-relaxed italic">
                    "{latestLog.recommendation}"
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#141416] p-4 border border-[#1d1d1f] text-[9px] font-mono text-[#575653] uppercase leading-normal mt-6">
            // WARNING INDICATION: ACTIVE TIME METRIC &gt; 10 HRS REDUCES IMMUNE RESILIENCE RATING AND TRIGGERS NOTIFICATION FAULTS.
          </div>
        </div>

      </div>

      {/* Breathing Guide and Digital Detox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        
        {/* 4-7-8 Breathing Guide */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 flex flex-col items-center justify-between min-h-[26rem] relative overflow-hidden">
          <div className="text-center space-y-1 w-full border-b border-[#1d1d1f] pb-4 z-10">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block font-bold">4-7-8 RESPIRATORY REGULATOR</span>
            <p className="font-mono text-[8px] text-[#93928e] uppercase">RESTORE SYMPATHETIC SYSTEM EQUILIBRIUM</p>
          </div>

          {/* Interactive Breathing Console with Premium Bubble Animation */}
          <div className="relative w-64 h-64 flex items-center justify-center my-4 z-10">
            {/* Background dynamic ambient glow */}
            <div 
              className={`absolute w-48 h-48 rounded-full blur-3xl transition-all duration-[1000ms] opacity-35 ${
                breathPhase === "inhale" ? "bg-[#ff3300]" :
                breathPhase === "hold" ? "bg-[#eae6df]" :
                breathPhase === "exhale" ? "bg-[#ff3300]/40" : "bg-transparent"
              }`}
            />

            {/* Pulsating breath waves/halos during inhalation */}
            {breathPhase === "inhale" && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  className="absolute w-40 h-40 rounded-full border border-[#ff3300]/50 pointer-events-none"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.4 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 2, delay: 1, repeat: Infinity, ease: "easeOut" }}
                  className="absolute w-40 h-40 rounded-full border border-[#ff3300]/25 pointer-events-none"
                />
              </>
            )}

            {/* SVG Progress Ring */}
            <svg className="absolute w-56 h-56 transform -rotate-90 select-none pointer-events-none">
              <circle
                cx="112"
                cy="112"
                r="90"
                stroke="#1d1d1f"
                strokeWidth="3"
                fill="transparent"
              />
              {breathingActive && (
                <motion.circle
                  cx="112"
                  cy="112"
                  r="90"
                  stroke="#ff3300"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 90}
                  animate={{ 
                    strokeDashoffset: (2 * Math.PI * 90) - (((breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 7 : breathPhase === "exhale" ? 8 : 1) - breathSeconds) / (breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 7 : breathPhase === "exhale" ? 8 : 1)) * (2 * Math.PI * 90)
                  }}
                  transition={{ duration: 1, ease: "linear" }}
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Pulsating Glassmorphic Bubble */}
            <motion.div
              animate={
                breathPhase === "inhale" ? { scale: 1.4, borderColor: "#ff3300" } :
                breathPhase === "hold" ? { scale: 1.45, borderColor: "#eae6df", boxShadow: "0 0 25px rgba(234, 230, 223, 0.25)" } :
                breathPhase === "exhale" ? { scale: 0.9, borderColor: "#ff3300/30" } :
                { scale: 1.0, borderColor: "#2d2d30" }
              }
              transition={{ 
                duration: breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 7 : breathPhase === "exhale" ? 8 : 1.5,
                ease: "easeInOut"
              }}
              className="relative w-40 h-40 rounded-full border flex flex-col items-center justify-center bg-[#070708]/90 backdrop-blur-md z-10"
            >
              {/* Inner fluid indicator layer */}
              <motion.div
                animate={
                  breathPhase === "inhale" ? { scale: 1.2, backgroundColor: "rgba(255, 51, 0, 0.15)" } :
                  breathPhase === "hold" ? { scale: 1.25, backgroundColor: "rgba(234, 230, 223, 0.12)" } :
                  breathPhase === "exhale" ? { scale: 0.8, backgroundColor: "rgba(29, 29, 31, 0.4)" } :
                  { scale: 1.0, backgroundColor: "rgba(0, 0, 0, 0)" }
                }
                transition={{ 
                  duration: breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 7 : breathPhase === "exhale" ? 8 : 1.5,
                  ease: "easeInOut"
                }}
                className="absolute inset-2 rounded-full -z-10"
              />

              <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e]">
                {breathingActive ? breathPhase : "STANDBY"}
              </span>
              
              <div className="my-1 flex items-baseline justify-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${breathPhase}-${breathSeconds}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="text-4xl font-extrabold text-[#f2efea] font-mono leading-none"
                  >
                    {breathingActive ? breathSeconds : "0"}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs font-mono text-[#575653] ml-0.5">s</span>
              </div>

              <span className="font-mono text-[7px] text-[#ff3300] uppercase tracking-widest mt-1">
                {breathingActive ? "4-7-8 CYCLE" : "READY"}
              </span>
            </motion.div>
          </div>

          {/* Descriptive instructions */}
          <div className="text-center z-10 mb-4 h-8 flex items-center justify-center">
            <p className="text-[10px] font-mono text-[#93928e] uppercase leading-relaxed max-w-sm">
              {getPhasePrompt()}
            </p>
          </div>

          <div className="text-center w-full z-10">
            <button
              onClick={() => setBreathingActive(!breathingActive)}
              className={`w-full py-3.5 text-xs font-mono tracking-widest uppercase border cursor-pointer transition-colors ${
                breathingActive 
                  ? "border-[#ff3300]/30 text-[#ff3300] bg-[#ff3300]/5" 
                  : "border-[#2d2d30] text-[#93928e] hover:text-[#f2efea]"
              }`}
            >
              {breathingActive ? "DEACTIVATE REGULATOR" : "ACTIVATE REGULATOR"}
            </button>
          </div>
        </div>

        {/* Digital Detox Counter */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 flex flex-col items-center justify-between min-h-[22rem]">
          <div className="text-center space-y-1 w-full border-b border-[#1d1d1f] pb-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block font-bold">DIGITAL DETOX SHUTDOWN TIMER</span>
            <p className="font-mono text-[8px] text-[#93928e] uppercase">CEASE EXTERNAL STIMULI FLOW FOR FOCUS LOCK</p>
          </div>

          {/* Monospace Countdown */}
          <div className="text-6xl font-extrabold tracking-widest text-[#f2efea] font-mono my-8">
            {formatDetoxTime()}
          </div>

          <div className="w-full space-y-4">
            <p className="font-mono text-[8px] text-[#575653] uppercase text-center">
              {detoxActive ? "PAUSE ACTIVE. SHUT DOWN COMMS, STRETCH, DRINK WATER." : "DETOX PRESET: 25 MINUTE OFFLINE PAUSE"}
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => setDetoxActive(!detoxActive)}
                className={`flex-1 py-3.5 text-xs font-mono tracking-widest uppercase border cursor-pointer transition-colors ${
                  detoxActive 
                    ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5" 
                    : "border-[#2d2d30] text-[#93928e] hover:text-[#f2efea]"
                }`}
              >
                {detoxActive ? "ABORT DETOX" : "COMMIT DETOX"}
              </button>
              
              <button
                onClick={() => { setDetoxActive(false); setDetoxSeconds(25 * 60); }}
                className="px-4 py-3.5 border border-[#2d2d30] text-[#93928e] hover:text-[#ff3300] hover:border-[#ff3300] transition-colors cursor-pointer"
                title="RESET TIMELINE"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
