"use client";

import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Copy, Check, Sparkles } from "lucide-react";

export default function ReplyGeneratorView() {
  const { generateToneReplies, repliesResult, repliesStreamText, isAILoading, activePersonality } = useAppStore();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("Empathetic");
  const [length, setLength] = useState("Medium");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    generateToneReplies(message, tone, length);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const tones = [
    "Empathetic",
    "Casual",
    "Professional",
    "Boundary-Setting",
    "Confident",
    "Supportive"
  ];

  return (
    <div className="w-full space-y-12">
      
      {/* Page Title */}
      <div className="border-b border-[#1d1d1f] pb-8">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ff3300] block mb-2 font-bold">COMMUNICATION FILTER MATRIX</span>
        <h2 className="text-4xl font-extrabold tracking-tighter uppercase font-sans text-[#f2efea]">AI REPLY GENERATOR</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] mt-3">
          SYNTHESIZE PRE-FORMULATED DRAFTS IN DESIRED TONE FREQUENCIES TO EXPEDITE OUTBOX FLOW.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Parameters Form panel */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 space-y-6">
          <div className="border-b border-[#1d1d1f] pb-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">GENERATION INPUT NODES</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input message */}
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">RECEIVED MESSAGE</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="PASTE THE OUTGOING OR INCOMING MSG REQUIRING CORRESPONDENCE DRAFT..."
                className="w-full h-32 p-4 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono resize-none"
              />
            </div>

            {/* Tone matrix selector */}
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">TONE SPECTRUM FILTER</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tones.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTone(t)}
                    className={`py-2 text-[8px] font-mono uppercase tracking-wider border cursor-pointer transition-colors ${
                      tone === t 
                        ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5 font-bold" 
                        : "border-[#2d2d30] text-[#93928e] hover:text-[#f2efea] hover:border-[#93928e]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Length parameter */}
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">LENGTH RANGE</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Short", "Medium", "Long"] as const).map((len) => (
                  <button
                    type="button"
                    key={len}
                    onClick={() => setLength(len)}
                    className={`py-2 text-[8px] font-mono uppercase tracking-wider border cursor-pointer transition-colors ${
                      length === len 
                        ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5 font-bold" 
                        : "border-[#2d2d30] text-[#93928e] hover:text-[#f2efea] hover:border-[#93928e]"
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isAILoading || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#ff3300] hover:bg-[#f2efea] hover:text-[#070708] transition-colors text-xs font-mono tracking-widest uppercase text-[#ffffff] cursor-pointer disabled:opacity-50"
            >
              {isAILoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin"></span>
              ) : (
                "SYNTHESIZE RESPONSE DRAFTS"
              )}
            </button>

          </form>
        </div>

        {/* Output list panel */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 min-h-[28rem] flex flex-col justify-between">
          <div className="border-b border-[#1d1d1f] pb-4 mb-6">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block">SYNTHESIS OUTPUT STREAM</span>
          </div>

          {!repliesResult && !isAILoading ? (
            <div className="text-center my-auto py-12 space-y-4">
              <div className="w-10 h-10 border border-[#2d2d30] flex items-center justify-center mx-auto text-[#575653]">
                ?
              </div>
              <p className="font-mono text-xs text-[#93928e] uppercase tracking-wider">AWAITING DRAFT SYNTHESIS PARAMETERS</p>
              <p className="font-mono text-[9px] text-[#575653] max-w-xs mx-auto leading-normal uppercase">
                SPECIFY INPUT MESSAGES AND CHOOSE AN ACCENT FILTER TO GENERATE CORRESPONDENCE ALTERNATIVES.
              </p>
            </div>
          ) : isAILoading ? (
            <div className="text-center my-auto py-12 space-y-4">
              <span className="w-8 h-8 border-2 border-[#ff3300] border-t-transparent animate-spin mx-auto block"></span>
              <p className="font-mono text-xs text-[#ff3300] tracking-widest uppercase">Drafting replies...</p>
              <p className="font-mono text-[9px] text-[#575653] uppercase">{activePersonality} mode</p>
              {repliesStreamText && (
                <pre className="text-left text-[9px] font-mono text-[#93928e] whitespace-pre-wrap max-h-40 overflow-y-auto border border-[#1d1d1f] p-3">
                  {repliesStreamText}
                </pre>
              )}
            </div>
          ) : repliesResult ? (
            <div className="space-y-6 animate-slide-reveal my-auto">
              {repliesResult.map((reply, idx) => (
                <div 
                  key={idx}
                  className="border border-[#1d1d1f] bg-[#070708] p-5 flex items-start justify-between gap-4 hover:border-[#ff3300]/40 transition-colors"
                >
                  <div className="space-y-2">
                    <span className="font-mono text-[8px] text-[#ff3300] font-bold uppercase tracking-wider">DRAFT ROUTE // 0{idx + 1}</span>
                    <p className="font-sans text-xs text-[#f2efea] leading-relaxed italic">
                      "{reply}"
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleCopy(reply, idx)}
                    className="p-2 border border-[#2d2d30] text-[#93928e] hover:text-[#ff3300] hover:border-[#ff3300] transition-colors cursor-pointer shrink-0 mt-2"
                    title="COPY TO BOARD"
                  >
                    {copiedIndex === idx ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

        </div>

      </div>
    </div>
  );
}
