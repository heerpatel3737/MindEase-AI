"use client";

import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Copy, Check } from "lucide-react";

export default function SocialConfidenceView() {
  const { simulateSocialDilemma, simulationResult, simulationStreamText, isAILoading, activePersonality, addNotification } = useAppStore();
  const [scenario, setScenario] = useState("salary_negotiation");
  const [customText, setCustomText] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    simulateSocialDilemma(scenario, customText);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    addNotification("Safe phrasing copied.", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const scenarioPresets = [
    { id: "salary_negotiation", label: "Salary Negotiation", desc: "Asking manager for salary adjustments" },
    { id: "apology_friend", label: "Apologize to Friend", desc: "Resolving misunderstandings or late cancellations" },
    { id: "roommate_boundary", label: "Roommate Boundary", desc: "Speaking about chores or shared spacing guidelines" },
    { id: "decline_invitation", label: "Decline Invitation", desc: "Saying no to high-stress social gatherings politely" }
  ];

  return (
    <div className="w-full space-y-12">
      
      {/* Module Title */}
      <div className="border-b border-[#1d1d1f] pb-8">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ff3300] block mb-2 font-bold font-mono">INTERPERSONAL DYNAMICS LAB</span>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tighter uppercase font-sans text-[#f2efea]">SOCIAL CONFIDENCE SIMULATOR</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] mt-3">
          MAP INTERPERSONAL RISK VECTORS, DE-ESCALATE DEFENSIVE TRIGGERS, AND DRAFT EMOTIONALLY INTELLIGENT PHRASINGS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        
        {/* Scenario and input form */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-5 sm:p-8 space-y-6">
          <div className="border-b border-[#1d1d1f] pb-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">SIMULATION PARAMETERS</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">PRESET SITUATION</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scenarioPresets.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setScenario(sc.id)}
                    className={`p-4 text-left border transition-all cursor-pointer ${
                      scenario === sc.id 
                        ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5 font-bold" 
                        : "border-[#2d2d30] text-[#93928e] hover:text-[#f2efea] hover:border-[#93928e]"
                    }`}
                  >
                    <p className="font-mono text-[9px] uppercase tracking-wider">{sc.label}</p>
                    <span className="font-mono text-[8px] text-[#575653] block leading-tight mt-1">{sc.desc.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">CUSTOM SCENARIO CONTEXT (OPTIONAL)</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="DESCRIBE EXACTLY WHAT IS CREATING ANXIETY, OR DRAFT A ROUGH OUTLINE OF WHAT YOU WISH TO SAY..."
                className="w-full h-32 p-4 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isAILoading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#ff3300] hover:bg-[#f2efea] hover:text-[#070708] transition-colors text-xs font-mono tracking-widest uppercase text-[#ffffff] cursor-pointer disabled:opacity-50"
            >
              {isAILoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin"></span>
              ) : (
                "RUN CONFIDENCE FORECAST"
              )}
            </button>
          </form>
        </div>

        {/* Forecast output result display */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 min-h-[30rem] flex flex-col justify-between relative overflow-hidden">
          
          {!simulationResult && !isAILoading ? (
            <div className="text-center my-auto py-12 space-y-4">
              <div className="w-10 h-10 border border-[#2d2d30] flex items-center justify-center mx-auto text-[#575653]">
                ?
              </div>
              <p className="font-mono text-xs text-[#93928e] uppercase tracking-wider">AWAITING SIMULATION TRIGGER</p>
              <p className="font-mono text-[9px] text-[#575653] max-w-xs mx-auto leading-normal uppercase">
                SELECT A SCENARIO PARAMETER AND RUN THE SIMULATION FORECAST PROTOCOL.
              </p>
            </div>
          ) : isAILoading ? (
            <div className="text-center my-auto py-12 space-y-4">
              <span className="w-8 h-8 border-2 border-[#ff3300] border-t-transparent animate-spin mx-auto block"></span>
              <p className="font-mono text-xs text-[#ff3300] tracking-widest uppercase">Thinking through the scenario...</p>
              {simulationStreamText && (
                <pre className="text-left text-[9px] font-mono text-[#93928e] whitespace-pre-wrap max-h-40 overflow-y-auto border border-[#1d1d1f] p-3">
                  {simulationStreamText}
                </pre>
              )}
            </div>
          ) : simulationResult ? (
            <div className="space-y-6 animate-slide-reveal my-auto">
              <div className="border-b border-[#1d1d1f] pb-3 mb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block">INTERPERSONAL PROJECTIONS</span>
                <h3 className="font-sans font-extrabold text-sm uppercase tracking-wide text-[#f2efea] mt-1">SIMULATOR OUTPUT ANALYSIS</h3>
              </div>

              {/* Best Case Forecast */}
              <div className="border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2 text-xs">
                <span className="font-mono text-[8px] text-emerald-400 uppercase tracking-widest block font-bold">// BEST CASE REACTION</span>
                <p className="font-sans text-xs text-[#eae6df] leading-relaxed">
                  {simulationResult.best_case_reaction}
                </p>
              </div>

              {/* Worst Case Forecast */}
              <div className="border border-rose-500/20 bg-rose-500/5 p-5 space-y-2 text-xs">
                <span className="font-mono text-[8px] text-rose-400 uppercase tracking-widest block font-bold">// DEFENSIVE RISK FACTORS</span>
                <p className="font-sans text-xs text-[#eae6df] leading-relaxed">
                  {simulationResult.worst_case_reaction}
                </p>
              </div>

              {/* Phrasing draft card with Copy button */}
              <div className="border border-[#1d1d1f] bg-[#070708] p-5 space-y-4">
                <div>
                  <span className="font-mono text-[8px] text-[#ff3300] uppercase tracking-widest block font-bold">// RECOMMENDED DRAFT PHRASING</span>
                  <p className="font-sans text-xs text-[#f2efea] leading-relaxed italic mt-2">
                    "{simulationResult.safer_wording}"
                  </p>
                </div>
                
                <div className="flex justify-between items-center border-t border-[#1d1d1f] pt-3">
                  <span className="font-mono text-[8px] text-[#575653] uppercase font-bold">READY FOR TRANSMISSION</span>
                  <button
                    onClick={() => handleCopy(simulationResult.safer_wording)}
                    className={`px-3 py-1.5 text-[8px] font-mono uppercase tracking-wider border cursor-pointer transition-colors ${
                      copied 
                        ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" 
                        : "border-[#2d2d30] text-[#93928e] hover:text-[#f2efea] hover:border-[#93928e]"
                    }`}
                  >
                    {copied ? "COPIED TO CLIPBOARD" : "COPY DRAFT TEXT"}
                  </button>
                </div>
              </div>

              {/* Companion courage rating */}
              <div className="border border-[#ff3300]/20 bg-[#ff3300]/5 p-5 space-y-2 text-xs">
                <span className="font-mono text-[8px] text-[#ff3300] uppercase tracking-widest block font-bold">
                  // {activePersonality.toUpperCase()} COMPANION TACTICAL INSIGHT
                </span>
                <p className="font-sans text-xs text-[#eae6df] leading-relaxed">
                  {simulationResult.confidence_analysis}
                </p>
              </div>

            </div>
          ) : null}

          <div className="bg-[#141416] p-4 border border-[#1d1d1f] text-[9px] font-mono text-[#575653] leading-normal mt-6">
            Responses adapt to your history and current emotional state.
          </div>
          
        </div>
      </div>
    </div>
  );
}
