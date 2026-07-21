"use client";

import React, { useMemo, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { CheckCircle } from "lucide-react";
import AIOrb from "./AIOrb";

const DashboardView = React.memo(function DashboardView() {
  const user = useAppStore((s) => s.user);
  const mentalLoadScore = useAppStore((s) => s.mentalLoadScore);
  const decisionPressureMeter = useAppStore((s) => s.decisionPressureMeter);
  const optimizedSchedule = useAppStore((s) => s.optimizedSchedule);
  const personalityAdvice = useAppStore((s) => s.personalityAdvice);
  const burnoutHistory = useAppStore((s) => s.burnoutHistory);
  const updateDecisionStatus = useAppStore((s) => s.updateDecisionStatus);

  // NOTE: fetchDashboardData and fetchBurnoutHistory are already called inside
  // login() and restoreSession() — no need to re-fetch here on mount.

  // Memoize chart data — recomputed only when burnoutHistory changes
  const chartData = useMemo(
    () =>
      burnoutHistory
        .map((log) => ({
          time: new Date(log.created_at).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          }),
          fatigue: log.score,
        }))
        .slice(-7),
    [burnoutHistory]
  );

  const getCategoryLabel = useCallback(
    (category: string) => (category ? category.toUpperCase() : "GENERAL"),
    []
  );

  const getLoadText = useCallback((score: number) => {
    if (score < 30) return "OPTIMAL PACE";
    if (score < 60) return "BALANCED DEMAND";
    if (score < 80) return "ELEVATED FRICTION";
    return "CRITICAL PRESSURE";
  }, []);

  const handleResolve = useCallback(
    (id: number) => updateDecisionStatus(id, "Done"),
    [updateDecisionStatus]
  );

  return (
    <div className="w-full space-y-12">

      {/* 1. Giant Asymmetrical Manifesto Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end border-b border-[#1d1d1f] pb-10">
        <div className="lg:col-span-2 space-y-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ff3300] block">
            COGNITIVE MANIFESTO
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase font-sans text-[#f2efea] leading-[0.85]">
            YOUR BRAIN<br />
            SHOULD NOT FEEL<br />
            LIKE A TASK MANAGER.
          </h1>
        </div>
        <div className="bg-[#0d0d0e] border border-[#1d1d1f] p-6 space-y-3">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] block">
            COMPANION DIRECTIVE
          </span>
          <p className="font-sans text-xs italic font-medium leading-relaxed text-[#eae6df]">
            &ldquo;{personalityAdvice}&rdquo;
          </p>
          <div className="flex justify-between items-center font-mono text-[8px] text-[#575653] border-t border-[#1d1d1f] pt-3 mt-4">
            <span>SYNC // OK</span>
            <span>USER // {user?.username?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* 2. Stark Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Metric 1: Mental Load */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 flex flex-col justify-between h-64">
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] block">
              MENTAL LOAD LAYER
            </span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-[#ff3300] block">
              {getLoadText(mentalLoadScore)}
            </span>
          </div>
          <div className="my-4">
            <span className="text-7xl font-extrabold tracking-tighter text-[#f2efea] font-sans leading-none">
              {mentalLoadScore}
              <span className="text-lg font-mono text-[#575653] uppercase ml-1">%</span>
            </span>
          </div>
          <div className="border-t border-[#1d1d1f] pt-3">
            <p className="font-mono text-[9px] text-[#93928e] uppercase leading-normal">
              {mentalLoadScore > 75
                ? "RESOURCE EXHAUSTION DETECTED. IMMEDIATE BREAK CODES ADVISED."
                : mentalLoadScore > 40
                ? "BALANCED LOAD STATE. SHUT DOWN BACKGROUND PROCESSING UNITS."
                : "RESERVES OPTIMIZED. SYSTEM EFFICIENCY LEVEL MAXIMUM."}
            </p>
          </div>
        </div>

        {/* Metric 2: Decision Pressure */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 flex flex-col justify-between h-64">
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] block">
              DECISION PRESSURE
            </span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-[#ff3300] block">
              {optimizedSchedule.length} PENDING NODES
            </span>
          </div>
          <div className="my-4">
            <span className="text-7xl font-extrabold tracking-tighter text-[#f2efea] font-sans leading-none">
              {decisionPressureMeter}
              <span className="text-lg font-mono text-[#575653] uppercase ml-1">PSI</span>
            </span>
          </div>
          <div className="border-t border-[#1d1d1f] pt-3">
            <p className="font-mono text-[9px] text-[#93928e] uppercase leading-normal">
              BASED ON DILEMMAS LOGGED IN CURRENT QUEUE. HIGH PRESSURE INHIBITS STRATEGIC ACCURACY.
            </p>
          </div>
        </div>

        {/* Neural Monitor AI Assistant Console */}
        <div className="border border-[#1d1d1f]">
          <AIOrb />
        </div>

      </div>

      {/* 3. Asymmetrical Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Today's Sequence (Best Actions) */}
        <div className="lg:col-span-2 border border-[#1d1d1f] bg-[#0d0d0e] p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-[#1d1d1f] pb-4">
            <h3 className="font-sans font-extrabold text-sm uppercase tracking-wider text-[#f2efea]">
              AI SEQUENCE PATH
            </h3>
            <span className="font-mono text-[8px] uppercase tracking-widest text-[#ff3300]">
              STRESS-MINIMIZED FLOW
            </span>
          </div>

          {optimizedSchedule.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="font-mono text-xs text-[#93928e] uppercase">
                Cognitive queue resolved. No dilemmas registered.
              </p>
              <p className="font-mono text-[9px] text-[#575653] uppercase">
                INPUT NEW PROBLEM PARAMETERS INSIDE THE DECISION ENGINE MODULE.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {optimizedSchedule.map((item) => (
                <div
                  key={item.decision_id}
                  className="border border-[#1d1d1f] bg-[#070708] p-5 flex items-start justify-between gap-6 hover:border-[#ff3300]/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[8px] bg-[#141416] border border-[#2d2d30] px-2 py-0.5 text-[#ff3300] font-bold uppercase tracking-wider">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="font-mono text-[8px] text-[#575653] uppercase">
                        {item.energy_bracket}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-[#f2efea] uppercase tracking-tight font-sans leading-snug">
                      {item.title}
                    </h4>
                    <p className="font-mono text-[9px] text-[#93928e] uppercase leading-relaxed italic border-l border-[#ff3300] pl-3">
                      &ldquo;{item.suggestion}&rdquo;
                    </p>
                  </div>

                  <button
                    onClick={() => handleResolve(item.decision_id)}
                    className="p-2 border border-[#2d2d30] text-[#93928e] hover:text-[#ff3300] hover:border-[#ff3300] transition-colors cursor-pointer shrink-0"
                    title="RESOLVE NODE"
                  >
                    <CheckCircle size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cognitive Health Line Chart */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 flex flex-col justify-between space-y-6">
          <div className="border-b border-[#1d1d1f] pb-4">
            <h3 className="font-sans font-extrabold text-sm uppercase tracking-wider text-[#f2efea]">
              FATIGUE CHRONO PLOT
            </h3>
            <span className="font-mono text-[8px] uppercase tracking-wider text-[#93928e] block mt-1">
              LOG HISTORY TRENDLINE
            </span>
          </div>

          <div className="h-44 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="font-mono text-[9px] text-[#575653] uppercase">
                  NO DATA LOGS LOADED. COMMITTED LOGS WILL PLOT COGNITIVE HEALTH TRENDS.
                </p>
              </div>
            ) : (
              <LineChart width={320} height={176} data={chartData}>
                  <XAxis
                    dataKey="time"
                    stroke="#575653"
                    fontSize={8}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#575653"
                    fontSize={8}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0d0d0e",
                      border: "1px solid #1d1d1f",
                      borderRadius: "0px",
                      fontSize: "10px",
                      fontFamily: "JetBrains Mono",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fatigue"
                    stroke="#ff3300"
                    strokeWidth={1.5}
                    dot={{ fill: "#ff3300", r: 2 }}
                    activeDot={{ r: 4, stroke: "rgba(255, 51, 0, 0.2)", strokeWidth: 4 }}
                  />
                </LineChart>
            )}
          </div>

          <div className="bg-[#141416] p-4 border border-[#1d1d1f] text-[9px] font-mono text-[#93928e] uppercase leading-normal space-y-1">
            <span className="font-bold text-[#ff3300] block">// INSTRUCTIONAL TIPS</span>
            KEEP SYSTEM LOAD VALUE BELOW 50% METRIC TO MAXIMIZE STRATEGIC CALCULATION CAPACITY.
          </div>
        </div>

      </div>
    </div>
  );
});

export default DashboardView;
