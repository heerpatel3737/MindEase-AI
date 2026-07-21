"use client";

import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  Heart,
  Users,
  Brain,
  Target,
  Zap,
  Clock,
  Shield,
  MessageCircle,
  Briefcase,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PersonaConfig {
  name: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  description: string;
  benefit: string;
}

const PERSONAS: Record<string, PersonaConfig> = {
  "Calm Therapist": {
    name: "Calm Therapist",
    icon: Heart,
    description: "Help regulate emotions",
    benefit: "Grounding & reassurance",
  },
  "Best Friend": {
    name: "Best Friend",
    icon: Users,
    description: "Talk like a trusted friend",
    benefit: "Warm & encouraging",
  },
  "Logical Analyst": {
    name: "Logical Analyst",
    icon: Brain,
    description: "Reduce emotional bias",
    benefit: "Facts & reasoning",
  },
  "Decision Coach": {
    name: "Decision Coach",
    icon: Target,
    description: "Help make decisions",
    benefit: "Action plans",
  },
  "Confidence Builder": {
    name: "Confidence Builder",
    icon: Zap,
    description: "Fight self-doubt",
    benefit: "Empowerment",
  },
  "Productivity Mentor": {
    name: "Productivity Mentor",
    icon: Clock,
    description: "Combat procrastination",
    benefit: "Strategic planning",
  },
  "Tough Love Coach": {
    name: "Tough Love Coach",
    icon: Shield,
    description: "Challenge overthinking",
    benefit: "Direct & honest",
  },
  "Social Coach": {
    name: "Social Coach",
    icon: MessageCircle,
    description: "Relationships & communication",
    benefit: "Social intelligence",
  },
  "Career Mentor": {
    name: "Career Mentor",
    icon: Briefcase,
    description: "Career decisions & growth",
    benefit: "Professional guidance",
  },
  "Adaptive Companion": {
    name: "Adaptive Companion",
    icon: Sparkles,
    description: "Learn from your patterns",
    benefit: "Personalized adaptation",
  },
};

export default function FocusModeSelector() {
  const activePersonality = useAppStore((s) => s.activePersonality);
  const setPersonality = useAppStore((s) => s.setPersonality);
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePersonalityChange = (persona: string) => {
    setPersonality(persona as typeof activePersonality);
    setIsExpanded(false);
  };

  const currentPersona = PERSONAS[activePersonality] || PERSONAS["Calm Therapist"];
  const CurrentIcon = currentPersona.icon;

  return (
    <div className="mb-6 pb-6 border-b border-[#1d1d1f]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 p-3 rounded border border-[#2d2d30] hover:border-[#ff3300]/50 hover:bg-[#141416] transition-all"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#ff3300]">
            <CurrentIcon size={18} />
          </div>
          <div className="text-left min-w-0">
            <p className="font-mono text-[8px] uppercase tracking-wider text-[#93928e]">
              FOCUS MODE
            </p>
            <p className="font-mono text-[10px] font-bold text-[#f2efea] truncate">
              {activePersonality}
            </p>
          </div>
        </div>
        <div className="text-[#ff3300] shrink-0">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
          {Object.entries(PERSONAS).map(([key, persona]) => {
            const Icon = persona.icon;
            const isActive = activePersonality === key;

            return (
              <button
                key={key}
                onClick={() => handlePersonalityChange(key)}
                className={`w-full flex items-start gap-3 p-3 rounded border transition-all text-left ${
                  isActive
                    ? "border-[#ff3300] bg-[#1a1a1c]"
                    : "border-[#2d2d30] hover:border-[#ff3300]/30 hover:bg-[#141416]"
                }`}
              >
                <div
                  className={`w-8 h-8 flex items-center justify-center shrink-0 rounded ${
                    isActive
                      ? "bg-[#ff3300]/20 text-[#ff3300]"
                      : "text-[#93928e]"
                  }`}
                >
                  <Icon size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`font-mono text-[9px] font-bold uppercase tracking-wider ${
                      isActive ? "text-[#ff3300]" : "text-[#f2efea]"
                    }`}
                  >
                    {persona.name}
                  </p>
                  <p className="font-mono text-[7px] text-[#93928e] mt-0.5">
                    {persona.description}
                  </p>
                  <p className="font-mono text-[7px] text-[#575653] mt-1">
                    → {persona.benefit}
                  </p>
                </div>

                {isActive && (
                  <div className="w-2 h-2 bg-[#ff3300] rounded-full shrink-0 mt-1"></div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isExpanded && (
        <p className="font-mono text-[8px] text-[#575653] mt-2 px-1">
          {currentPersona.benefit}
        </p>
      )}
    </div>
  );
}
