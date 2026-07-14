"use client";

import React, { useState, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { Mic, MicOff } from "lucide-react";
import { createVoiceRecorder } from "../lib/voiceRecorder";

export default function TranslatorView() {
  const {
    translateOverthinking,
    translationResult,
    translationStreamText,
    isAILoading,
    isVoiceTranscribing,
    transcribeVoice,
    cancelAIStream,
    activePersonality,
  } = useAppStore();
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(createVoiceRecorder());

  const toggleRecording = async () => {
    const recorder = recorderRef.current;
    if (isRecording) {
      const blob = await recorder.stop();
      setIsRecording(false);
      if (blob) {
        const transcript = await transcribeVoice(blob);
        if (transcript) setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
      return;
    }
    try {
      await recorder.start();
      setIsRecording(true);
    } catch {
      alert("Microphone access is required for voice input.");
    }
  };

  const handleTranslate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    translateOverthinking(message, context);
  };

  const getUrgencyText = (level: number) => {
    if (level <= 3) return "LOW URGENCY // DELAYED RESPONSE ADVISABLE";
    if (level <= 6) return "MODERATE RESPONSE CURVE // NORMAL PRIORITY";
    return "ACTION CRITICAL // REPLY SCHEDULING ADVISABLE";
  };

  return (
    <div className="w-full space-y-12">
      
      {/* Module Title Block */}
      <div className="border-b border-[#1d1d1f] pb-8">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ff3300] block mb-2">Cognitive Translator Layer</span>
        <h2 className="text-4xl font-extrabold tracking-tighter uppercase font-sans text-[#f2efea]">AI OVERTHINKING TRANSLATOR</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] mt-3">
          DECODE COMPLEX TEXTS, DELAYED MESSAGES, OR FORMAL CORRESPONDENCE INTO FACT-BASED REASSURANCE.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Messages Input Box */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 space-y-6">
          <div className="border-b border-[#1d1d1f] pb-4">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] block">INPUT SIGNAL PARAMETERS</span>
          </div>
          
          <form onSubmit={handleTranslate} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e]">MESSAGE CONTENT</label>
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[8px] font-mono uppercase tracking-wider border cursor-pointer transition-all ${
                    isRecording 
                      ? "bg-[#ff3300]/10 border-[#ff3300] text-[#ff3300] animate-pulse" 
                      : "bg-transparent border-[#2d2d30] text-[#93928e] hover:text-[#f2efea]"
                  }`}
                >
                  {isRecording ? <MicOff size={10} /> : <Mic size={10} />}
                  {isRecording || isVoiceTranscribing ? "STOP RECORDING" : "VOICE DICTATION"}
                </button>
              </div>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="PASTE THE TEXT, EMAIL, OR RESPONSE CODE YOU ARE ANALYZING..."
                className="w-full h-36 p-4 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">CONTEXT FACTORS (OPTIONAL)</label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., 'SENT BY BOSS AT 10 PM' OR 'NO REPLY FOR 12 HOURS'..."
                className="w-full px-4 py-3 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isAILoading || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#ff3300] hover:bg-[#f2efea] hover:text-[#070708] transition-colors text-xs font-mono tracking-widest uppercase text-[#ffffff] cursor-pointer disabled:opacity-50"
            >
              {isAILoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin"></span>
              ) : (
                "TRANSLATE EMOTIONAL CODES"
              )}
            </button>
            {isAILoading && (
              <button
                type="button"
                onClick={cancelAIStream}
                className="w-full py-2 text-[8px] font-mono uppercase tracking-wider border border-[#2d2d30] text-[#93928e] hover:text-[#f2efea] cursor-pointer"
              >
                Stop
              </button>
            )}
          </form>
        </div>

        {/* Translation Output Result */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 min-h-[30rem] flex flex-col justify-between relative overflow-hidden">
          
          {!translationResult && !isAILoading ? (
            <div className="text-center my-auto py-12 space-y-4">
              <div className="w-10 h-10 border border-[#2d2d30] flex items-center justify-center mx-auto text-[#575653]">
                ?
              </div>
              <p className="font-mono text-xs text-[#93928e] uppercase tracking-wider">AWAITING TRANSLATION NODE INPUT</p>
              <p className="font-mono text-[9px] text-[#575653] max-w-xs mx-auto leading-normal">
                PASTE A SIGNAL AND SELECT TRANSLATE TO CALCULATE SENDER INTENT.
              </p>
            </div>
          ) : isAILoading ? (
            <div className="text-center my-auto py-12 space-y-4">
              <span className="w-8 h-8 border-2 border-[#ff3300] border-t-transparent animate-spin mx-auto block"></span>
              <p className="font-mono text-xs text-[#ff3300] tracking-widest uppercase">Reading this with you...</p>
              <p className="font-mono text-[9px] text-[#575653] uppercase">{activePersonality} mode</p>
              {translationStreamText && (
                <pre className="text-left text-[9px] font-mono text-[#93928e] whitespace-pre-wrap max-h-40 overflow-y-auto border border-[#1d1d1f] p-3">
                  {translationStreamText}
                </pre>
              )}
            </div>
          ) : translationResult ? (
            <div className="space-y-6 animate-slide-reveal">
              {/* Output Header */}
              <div className="flex justify-between items-start border-b border-[#1d1d1f] pb-4">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block">TRANSLATION RESOLVED</span>
                  <h3 className="font-sans font-extrabold text-sm uppercase tracking-wide text-[#f2efea] mt-1">EMOTIONAL SPECTRUM REPORT</h3>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">CONFIDENCE</span>
                  <p className="font-sans text-sm font-extrabold text-emerald-400 mt-1">{translationResult.confidence_score}%</p>
                </div>
              </div>

              {/* Analysis Indicators Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#070708] border border-[#1d1d1f] p-4 space-y-1">
                  <span className="font-mono text-[8px] text-[#93928e] uppercase">TONE MATRIX</span>
                  <p className="font-mono text-[10px] font-bold text-[#f2efea] uppercase">{translationResult.emotional_tone}</p>
                </div>
                <div className="bg-[#070708] border border-[#1d1d1f] p-4 space-y-1">
                  <span className="font-mono text-[8px] text-[#93928e] uppercase">SECONDARY INTENT</span>
                  <p className="font-mono text-[10px] font-bold text-[#f2efea] uppercase">{translationResult.hidden_intent}</p>
                </div>
              </div>

              {/* Urgency Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-[8px] text-[#93928e]">
                  <span>CHRONOLOGICAL URGENCY LEVEL</span>
                  <span>{translationResult.urgency_level} // 10</span>
                </div>
                <div className="w-full h-1 bg-[#2d2d30]">
                  <div 
                    className="h-full bg-[#ff3300]"
                    style={{ width: `${translationResult.urgency_level * 10}%` }}
                  ></div>
                </div>
                <p className="font-mono text-[8px] text-[#575653] uppercase mt-1">
                  {getUrgencyText(translationResult.urgency_level)}
                </p>
              </div>

              {/* Likely Meaning objective Translation */}
              <div className="border border-[#1d1d1f] bg-[#070708] p-5 space-y-2">
                <span className="font-mono text-[8px] text-[#ff3300] uppercase tracking-widest block font-bold">// OBJECTIVE DECODED MEANING</span>
                <p className="font-sans text-xs italic font-semibold text-[#f2efea] leading-relaxed">
                  "{translationResult.likely_meaning}"
                </p>
              </div>

              {/* Reassurance Prescription Card */}
              <div className="border border-[#ff3300]/20 bg-[#ff3300]/5 p-5 space-y-2">
                <span className="font-mono text-[8px] text-[#ff3300] uppercase tracking-widest block font-bold">// COMPANION CLINICAL REASSURANCE</span>
                <p className="font-sans text-xs font-medium text-[#eae6df] leading-relaxed">
                  {translationResult.reassurance}
                </p>
              </div>

              {/* Action Bullet suggestions */}
              <div className="space-y-3 pt-2">
                <span className="font-mono text-[8px] text-[#93928e] uppercase tracking-widest block">// ACTIONABLE EXECUTION OPTIONS</span>
                <ul className="space-y-2">
                  {translationResult.suggestions.map((sug: string, idx: number) => (
                    <li key={idx} className="font-mono text-[9px] text-[#f2efea] flex items-start gap-2 uppercase">
                      <span className="w-1 h-1 bg-[#ff3300] mt-1 shrink-0"></span>
                      {sug}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          ) : null}
          
        </div>
      </div>
    </div>
  );
}
