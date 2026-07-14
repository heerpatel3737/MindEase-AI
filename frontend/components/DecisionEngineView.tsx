"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { Clock } from "lucide-react";

export default function DecisionEngineView() {
  const { 
    decisions, 
    optimizedSchedule, 
    mentalLoadScore,
    submitDecision, 
    updateDecisionStatus, 
    runScheduleOptimizer,
    fetchDecisions,
    fetchDashboardData
  } = useAppStore();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("work");
  const [priority, setPriority] = useState(2);
  const [difficulty, setDifficulty] = useState(2);

  useEffect(() => {
    fetchDecisions();
    fetchDashboardData();
  }, []);

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await submitDecision(title, category, priority, difficulty);
    setTitle("");
  };

  const getCategoryLabel = (cat: string) => {
    return cat ? cat.toUpperCase() : "GENERAL";
  };

  return (
    <div className="w-full space-y-12">
      
      {/* Module Title Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-[#1d1d1f] pb-8 gap-4">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ff3300] block mb-2 font-bold">FATIGUE DECAY PARAMETERS</span>
          <h2 className="text-4xl font-extrabold tracking-tighter uppercase font-sans text-[#f2efea]">DECISION FATIGUE ENGINE</h2>
          <p className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] mt-3">
            OFFLOAD COGNITIVE PARALYSIS BY SEQUENCING DAILY TASKS BASED ON ENERGY COEFFICIENTS.
          </p>
        </div>
        
        {decisions.filter(d => d.status === "Pending").length > 0 && (
          <button
            onClick={() => runScheduleOptimizer()}
            className="px-4 py-2 bg-[#ff3300] hover:bg-[#f2efea] hover:text-[#070708] text-[#ffffff] border border-[#ff3300] font-mono text-[9px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            OPTIMIZE SEQUENCING
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Log Dilemma Form */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 space-y-6">
          <div className="border-b border-[#1d1d1f] pb-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">REGISTER COGNITIVE BURDEN</span>
          </div>

          <form onSubmit={handleAddDecision} className="space-y-6">
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">DILEMMA DESCRIPTION</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 'CHOOSE FINAL ESSAY THEME' OR 'PLAN RECREATIONAL DINNER'..."
                className="w-full px-4 py-3 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono"
              />
            </div>

            {/* Category Tag */}
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">DILEMMA CATEGORY</label>
              <div className="grid grid-cols-4 gap-2">
                {(["work", "study", "food", "rest"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 text-[8px] font-mono uppercase tracking-wider border cursor-pointer transition-colors ${
                      category === cat 
                        ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5 font-bold" 
                        : "border-[#2d2d30] text-[#93928e] hover:text-[#f2efea] hover:border-[#93928e]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">PRIORITY</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriority(lvl)}
                      className={`flex-1 py-1.5 text-[8px] font-mono uppercase border cursor-pointer transition-colors ${
                        priority === lvl 
                          ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5 font-bold" 
                          : "border-[#2d2d30] text-[#575653] hover:text-[#93928e]"
                      }`}
                    >
                      {lvl === 1 ? "Low" : lvl === 2 ? "Med" : "High"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">DIFFICULTY</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`flex-1 py-1.5 text-[8px] font-mono uppercase border cursor-pointer transition-colors ${
                        difficulty === lvl 
                          ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5 font-bold" 
                          : "border-[#2d2d30] text-[#575653] hover:text-[#93928e]"
                      }`}
                    >
                      {lvl === 1 ? "Easy" : lvl === 2 ? "Med" : "Hard"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!title.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#ff3300] hover:bg-[#f2efea] hover:text-[#070708] transition-colors text-xs font-mono tracking-widest uppercase text-[#ffffff] cursor-pointer disabled:opacity-50"
            >
              OFFLOAD COGNITIVE BURDEN
            </button>
          </form>
        </div>

        {/* Dynamic Schedule View */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 min-h-[28rem] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-[#1d1d1f] pb-4">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block">OPTIMIZED SEQUENCE PATH</span>
            </div>
            
            {optimizedSchedule.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-10 h-10 border border-[#2d2d30] flex items-center justify-center mx-auto text-[#575653]">
                  ?
                </div>
                <p className="font-mono text-xs text-[#93928e] uppercase tracking-wider">COGNITIVE SCHEDULER INACTIVE</p>
                <p className="font-mono text-[9px] text-[#575653] max-w-xs mx-auto leading-normal uppercase">
                  LOG RECURRING PENDING TASKS ON THE LEFT MATRIX TO INITIALIZE AUTOMATED TIMELINE SEQUENCING.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[22rem] overflow-y-auto pr-1">
                {optimizedSchedule.map((item) => (
                  <div key={item.decision_id} className="relative pl-6 border-l border-[#2d2d30] pb-2 last:pb-0">
                    {/* Time marker node */}
                    <div className="absolute -left-1 top-2 w-2 h-2 bg-[#070708] border border-[#ff3300] flex items-center justify-center">
                      <div className="w-1 h-1 bg-[#ff3300]"></div>
                    </div>

                    <div className="border border-[#1d1d1f] bg-[#070708] p-4 flex justify-between items-center gap-4 hover:border-[#ff3300]/40 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[8px] text-[#ff3300] font-bold flex items-center gap-1">
                            <Clock size={10} /> {item.time_slot}
                          </span>
                          <span className="font-mono text-[8px] text-[#575653] uppercase">
                            {getCategoryLabel(item.category)} // {item.energy_bracket}
                          </span>
                        </div>
                        <h4 className="font-sans text-xs font-extrabold text-[#f2efea] uppercase tracking-tight leading-snug">
                          {item.title}
                        </h4>
                      </div>
                      
                      <button
                        onClick={() => updateDecisionStatus(item.decision_id, "Done")}
                        className="p-2 border border-[#2d2d30] text-[#93928e] hover:text-[#ff3300] hover:border-[#ff3300] transition-colors cursor-pointer shrink-0"
                        title="RESOLVE NODE"
                      >
                        RESOLVE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-[#141416] p-4 border border-[#1d1d1f] text-[9px] font-mono text-[#575653] uppercase leading-normal mt-6">
            // RULE METRIC: COMPLEX HIGH-COGNITIVE BLOCK SEQUENCING MAPS DILEMMAS TO HIGH-ENERGY SLOTS, DELEGATING EASY TASKS TO POST-NOON RE-ALLOCATION.
          </div>
        </div>

      </div>
    </div>
  );
}
