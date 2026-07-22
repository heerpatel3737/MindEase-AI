"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { Calendar, Edit3, Save, Search, Trash2, X } from "lucide-react";
import { createVoiceRecorder } from "../lib/voiceRecorder";

export default function JournalView() {
  const journals = useAppStore((s) => s.journals);
  const submitJournal = useAppStore((s) => s.submitJournal);
  const isAILoading = useAppStore((s) => s.isAILoading);
  const apiBaseUrl = useAppStore((s) => s.apiBaseUrl);
  const token = useAppStore((s) => s.token);
  const transcribeVoice = useAppStore((s) => s.transcribeVoice);
  const isVoiceTranscribing = useAppStore((s) => s.isVoiceTranscribing);

  const [entryText, setEntryText] = useState("");
  const [mood, setMood] = useState("Calm");
  const [isRecording, setIsRecording] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const recorderRef = useRef(createVoiceRecorder());
  
  // Analytics State
  const [insights, setInsights] = useState<any>({
    mood_distribution: {},
    extracted_triggers: {},
    total_entries: 0
  });

  const insightsLoadedRef = useRef(false);

  useEffect(() => {
    if (insightsLoadedRef.current) return;
    insightsLoadedRef.current = true;
    fetchInsights();
  }, [token, apiBaseUrl]);

  const fetchInsights = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/journal/insights`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (e) {
      console.error("Failed to load insights:", e);
    }
  };

  const toggleRecording = async () => {
    const recorder = recorderRef.current;
    if (isRecording) {
      const blob = await recorder.stop();
      setIsRecording(false);
      if (blob) {
        const transcript = await transcribeVoice(blob);
        if (transcript) setEntryText((prev) => (prev ? `${prev} ${transcript}` : transcript));
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

  const handleLogEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryText.trim()) return;

    await submitJournal(entryText, mood);
    setEntryText("");
    fetchInsights(); // refresh charts
  };

  const fetchFilteredJournals = async () => {
    if (!token) return;
    const query = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : "";
    try {
      const response = await fetch(`${apiBaseUrl}/api/journal/list${query}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        useAppStore.setState({ journals: await response.json() });
      }
    } catch (e) {
      console.error("Failed to search journals:", e);
    }
  };

  const saveEditedEntry = async (id: number) => {
    if (!token || !editingText.trim()) return;
    const response = await fetch(`${apiBaseUrl}/api/journal/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ entry_text: editingText }),
    });
    if (response.ok) {
      setEditingId(null);
      setEditingText("");
      await useAppStore.getState().fetchJournals();
      await fetchInsights();
    }
  };

  const deleteEntry = async (id: number) => {
    if (!token || !confirm("Delete this journal entry permanently?")) return;
    const response = await fetch(`${apiBaseUrl}/api/journal/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      await useAppStore.getState().fetchJournals();
      await fetchInsights();
    }
  };

  const moodsList = [
    { id: "Calm", label: "Calm", border: "border-emerald-500/30 text-emerald-400" },
    { id: "Anxiety", label: "Anxious", border: "border-rose-500/30 text-rose-400" },
    { id: "Burnout", label: "Drained", border: "border-purple-500/30 text-purple-400" },
    { id: "Excitement", label: "Excited", border: "border-amber-500/30 text-amber-400" },
    { id: "Tired", label: "Tired", border: "border-blue-500/30 text-blue-400" }
  ];

  return (
    <div className="w-full space-y-12">
      
      {/* Module Title Block */}
      <div className="border-b border-[#1d1d1f] pb-8">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ff3300] block mb-2 font-bold">COGNITIVE RECORDING LAB</span>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tighter uppercase font-sans text-[#f2efea]">AI VENTING & JOURNAL SYSTEM</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] mt-3">
          LOG EMOTIONAL STREAM-OF-CONSCIOUSNESS TO HARVEST MOOD INSIGHTS AND AUTO-RESOLVE ANXIETY VECTORS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        
        {/* Journal Writing Desk */}
        <div className="lg:col-span-2 border border-[#1d1d1f] bg-[#0d0d0e] p-5 sm:p-8 space-y-6">
          <div className="border-b border-[#1d1d1f] pb-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">JOURNAL ENTRIES RECORDER</span>
          </div>

          <form onSubmit={handleLogEntry} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e]">VENT SPACE</label>
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[8px] font-mono uppercase tracking-wider border cursor-pointer transition-all ${
                    isRecording 
                      ? "bg-[#ff3300]/10 border-[#ff3300] text-[#ff3300] animate-pulse" 
                      : "bg-transparent border-[#2d2d30] text-[#93928e] hover:text-[#f2efea]"
                  }`}
                >
                  {isRecording ? "LISTENING..." : "VOICE TRANSCRIBE"}
                </button>
              </div>
              
              <textarea
                required
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="FREE WRITE, DISCHARGE ANXIETIES, OR UNPACK PENDING CONCERNS WITH COMPANION LOGS..."
                className="w-full h-48 p-4 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono resize-none"
              />
            </div>

            {/* Mood selector */}
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">PRIMARY MOOD VIBE</label>
              <div className="flex flex-wrap gap-2">
                {moodsList.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMood(m.id)}
                    className={`px-4 py-2 text-[8px] font-mono uppercase tracking-wider border cursor-pointer transition-colors ${
                      mood === m.id 
                        ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5 font-bold" 
                        : "border-[#2d2d30] text-[#93928e] hover:text-[#f2efea] hover:border-[#93928e]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isAILoading || !entryText.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#ff3300] hover:bg-[#f2efea] hover:text-[#070708] transition-colors text-xs font-mono tracking-widest uppercase text-[#ffffff] cursor-pointer disabled:opacity-50"
            >
              {isAILoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin"></span>
              ) : (
                "COMMIT ENTRY TO SANCTUARY"
              )}
            </button>
          </form>
        </div>

        {/* Cognitive insights sidebar */}
        <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 space-y-6">
          <div className="border-b border-[#1d1d1f] pb-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block">SANCTUARY COG STATS</span>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center font-mono text-[9px]">
              <span className="text-[#93928e] uppercase">TOTAL ENTRIES PLOTTED</span>
              <span className="font-bold text-[#ff3300]">{insights.total_entries || 0}</span>
            </div>

            {/* Triggers list */}
            <div className="space-y-3 border-t border-[#1d1d1f] pt-4">
              <span className="font-mono text-[8px] text-[#93928e] uppercase block font-bold">// IDENTIFIED STRESS TRIGGERS</span>
              {Object.keys(insights.extracted_triggers || {}).length === 0 ? (
                <p className="font-mono text-[8px] text-[#575653] uppercase">AWAITING TRIGGER INDICES...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(insights.extracted_triggers).map(([word, val]: any) => (
                    <span 
                      key={word} 
                      className="px-2.5 py-1 bg-[#070708] border border-[#2d2d30] text-[8px] font-mono uppercase text-[#93928e]"
                    >
                      {word} ({val})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Mood distribution tags */}
            <div className="space-y-3 border-t border-[#1d1d1f] pt-4">
              <span className="font-mono text-[8px] text-[#93928e] uppercase block font-bold">// MOOD FREQUENCY MATRIX</span>
              {Object.keys(insights.mood_distribution || {}).length === 0 ? (
                <p className="font-mono text-[8px] text-[#575653] uppercase">NO MOOD RATINGS CURRENTLY CALCULATED.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(insights.mood_distribution).map(([key, val]: any) => (
                    <div key={key} className="flex justify-between items-center font-mono text-[9px]">
                      <span className="text-[#93928e] uppercase">{key}</span>
                      <span className="text-[#ff3300] font-bold">{val} LOGS</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Historical journal timeline list */}
      <div className="border border-[#1d1d1f] bg-[#0d0d0e] p-8 space-y-6">
        <div className="border-b border-[#1d1d1f] pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300] block">CHRONOLOGICAL ENTRY TIMELINE</span>
          <div className="flex items-center gap-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#575653]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchFilteredJournals();
                }}
                placeholder="SEARCH HISTORY"
                className="w-full pl-8 pr-3 py-2 text-[9px] bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono uppercase"
              />
            </div>
            <button
              type="button"
              onClick={fetchFilteredJournals}
              className="p-2 border border-[#2d2d30] text-[#93928e] hover:text-[#ff3300] hover:border-[#ff3300]"
              title="Search entries"
            >
              <Search size={13} />
            </button>
          </div>
        </div>
        
        {journals.length === 0 ? (
          <div className="py-12 text-center font-mono text-[9px] text-[#575653] uppercase">
            YOUR JOURNALING TIMELINE IS EMPTY. ENTER PENDING THOUGHTS TO POPULATE.
          </div>
        ) : (
          <div className="space-y-6 max-h-[35rem] overflow-y-auto pr-2">
            {journals.map((entry) => {
              const activeMood = moodsList.find(m => m.id === entry.primary_mood) || moodsList[0];
              return (
                <div 
                  key={entry.id} 
                  className="border border-[#1d1d1f] bg-[#070708] p-6 space-y-4 hover:border-[#ff3300]/40 transition-colors"
                >
                  <div className="flex justify-between items-center flex-wrap gap-2 border-b border-[#1d1d1f] pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={11} className="text-[#575653]" />
                      <span className="font-mono text-[8px] text-[#93928e] uppercase">
                        {new Date(entry.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 border text-[8px] font-mono uppercase tracking-wider ${activeMood.border}`}>
                      {entry.primary_mood}
                    </span>
                  </div>

                  {editingId === entry.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full min-h-32 p-3 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono resize-y"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEditedEntry(entry.id)}
                          className="flex items-center gap-2 px-3 py-2 border border-[#ff3300] text-[#ff3300] font-mono text-[8px] uppercase"
                        >
                          <Save size={12} />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText("");
                          }}
                          className="flex items-center gap-2 px-3 py-2 border border-[#2d2d30] text-[#93928e] font-mono text-[8px] uppercase"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-sans text-xs text-[#eae6df] leading-relaxed italic">
                      "{entry.entry_text}"
                    </p>
                  )}

                  {/* AI Compassionate feedback */}
                  {entry.ai_summary && (
                    <div className="border border-[#ff3300]/20 bg-[#ff3300]/5 p-4 space-y-2 text-xs">
                      <span className="font-mono text-[8px] text-[#ff3300] uppercase tracking-widest block font-bold">
                        // COMPANION SUMMARY INSIGHT
                      </span>
                      <p className="font-sans text-xs text-[#eae6df] leading-relaxed italic">
                        "{entry.ai_summary}"
                      </p>
                    </div>
                  )}

                  {/* Extracted triggers list */}
                  {entry.worry_triggers && (
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#1d1d1f]">
                      <span className="font-mono text-[8px] text-[#575653] uppercase font-bold">DETECTED TRIGGERS:</span>
                      {entry.worry_triggers.split(",").map((tr, index) => (
                        <span 
                          key={index}
                          className="px-2 py-0.5 bg-[#0d0d0e] border border-[#2d2d30] font-mono text-[8px] uppercase text-[#93928e]"
                        >
                          {tr.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-3 border-t border-[#1d1d1f]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditingText(entry.entry_text);
                      }}
                      className="p-2 border border-[#2d2d30] text-[#93928e] hover:text-[#ff3300] hover:border-[#ff3300]"
                      title="Edit entry"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 border border-[#2d2d30] text-[#93928e] hover:text-[#ff3300] hover:border-[#ff3300]"
                      title="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
