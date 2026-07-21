"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";

export default function AIOrb() {
  const activePersonality = useAppStore((s) => s.activePersonality);
  const isAILoading = useAppStore((s) => s.isAILoading);
  const mentalLoadScore = useAppStore((s) => s.mentalLoadScore);
  const [orbText, setOrbText] = useState("");
  const [tickerTick, setTickerTick] = useState(0);

  const getOrbMessage = () => {
    if (isAILoading) return "Working on your request...";

    const messages: Record<string, string[]> = {
      "Calm Therapist": [
        "Slow down. Unclench your jaw. You don't have to solve everything today.",
        "Your focus is limited - protect it by closing one tab at a time.",
        "Take one breath, then one small step. That's enough for now.",
        "Name the feeling before you react. It loses power when you can name it.",
        "What would grounded you most right now? Start there.",
      ],
      "Best Friend": [
        "You're overthinking again - and you're still doing fine.",
        "Drink some water. Close your eyes for thirty seconds. Seriously.",
        "Their delay is about their life, not your worth.",
        "You know this already. You're going to handle it.",
        "Real talk: you're being way harder on yourself than anyone else is.",
      ],
      "Logical Analyst": [
        "Separate facts from assumptions before you react.",
        "What evidence would change your interpretation?",
        "Most likely explanation is usually the boring one.",
        "What's the actual probability vs. your fear estimate?",
        "Strip away emotion. What does the data actually say?",
      ],
      "Decision Coach": [
        "Name the decision. Then choose the next move.",
        "Options, tradeoffs, recommendation. Keep it clean.",
        "A small committed choice beats another hour of looping.",
        "What's the smallest move that counts as forward?",
        "Decision made? Great. Now: what's the first step?",
      ],
      "Confidence Builder": [
        "Doubt is noise. One confident action beats ten worried thoughts.",
        "You're allowed to set boundaries without apologizing.",
        "The hard part is starting - you've done harder things.",
        "You've handled worse. This is practice, not judgment.",
        "The fact that you care means you can do this.",
      ],
      "Productivity Mentor": [
        "Pick the one task that moves the needle. Do that first.",
        "Mute notifications for the next hour. Protect your focus block.",
        "If it's not urgent, defer it. Your queue is full enough.",
        "Energy first, then effort. Which work requires peak energy?",
        "What's the smallest commitment you can make right now?",
      ],
      "Tough Love Coach": [
        "Stop feeding the loop. Do the next honest thing.",
        "You do not need more certainty. You need one action.",
        "Be kind to yourself, but do not negotiate with avoidance.",
        "The delay is costing more than the risk. Act.",
        "Comfort or growth. You know what matters here.",
      ],
      "Social Coach": [
        "Warm, clear, brief. That's the safest message shape.",
        "Assume less, ask better, repair sooner.",
        "You can protect the relationship without over-explaining.",
        "Lead with warmth. People respond to that.",
        "They're nervous too. You holding steady helps them.",
      ],
      "Career Mentor": [
        "Protect credibility with clarity and follow-through.",
        "Think in stakeholders, timelines, and leverage.",
        "Professional calm is a strategy.",
        "What outcome helps your reputation most?",
        "Competence is built in consistency. Show up.",
      ],
      "Adaptive Companion": [
        "I am using your recent patterns to keep this personal.",
        "Let's match the response to what your nervous system needs now.",
        "You have history here. We can use it wisely.",
        "I remember how you handled this before. You succeeded then.",
        "Your patterns show you learn. Trust that.",
      ],
    };

    const list = messages[activePersonality] || messages["Calm Therapist"];
    return list[Math.floor(Math.random() * list.length)];
  };

  const triggerGlowPrompt = () => setOrbText(getOrbMessage());

  useEffect(() => {
    triggerGlowPrompt();
  }, [activePersonality]);

  useEffect(() => {
    if (!isAILoading) return;
    const interval = setInterval(() => {
      setTickerTick((prev) => (prev + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, [isAILoading]);

  const loadingTicks = [".", "..", "...", ".."];

  return (
    <div
      onClick={triggerGlowPrompt}
      className={`w-full h-full flex flex-col justify-between p-6 border transition-colors cursor-pointer select-none bg-[#0d0d0e] ${
        isAILoading
          ? "border-[#ff3300]"
          : "border-[#1d1d1f] hover:border-[#ff3300]/40"
      }`}
    >
      <div className="flex justify-between items-center border-b border-[#1d1d1f] pb-3 mb-4">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300]">
          {isAILoading ? "SYNAPSE PROCESSOR" : "NEURAL COGNITION SYSTEM"}
        </span>
        <span className="font-mono text-[8px] tracking-wider text-[#93928e]">
          {isAILoading ? `BUSY${loadingTicks[tickerTick]}` : "IDLE // READY"}
        </span>
      </div>

      <div className="my-auto py-2">
        <p className="text-xl font-extrabold tracking-tight text-[#f2efea] font-sans leading-tight uppercase">
          "{orbText}"
        </p>
      </div>

      <div className="flex justify-between items-center border-t border-[#1d1d1f] pt-3 mt-4">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 ${isAILoading ? "bg-[#ff3300] animate-pulse" : "bg-[#93928e]"}`}></span>
          <div className="flex flex-col">
            <span className="font-mono text-[7px] uppercase tracking-wider text-[#93928e]">
              ACTIVE
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#ff3300]">
              {activePersonality}
            </span>
          </div>
        </div>
        <span className="font-mono text-[8px] text-[#575653] uppercase tracking-wider">
          LOAD RESIL: {100 - mentalLoadScore}%
        </span>
      </div>
    </div>
  );
}
