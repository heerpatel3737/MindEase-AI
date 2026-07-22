"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import FocusModeSelector from "./FocusModeSelector";
import { 
  LayoutDashboard, 
  HelpCircle, 
  MessageSquareReply, 
  Activity, 
  BookOpen, 
  Users, 
  Zap, 
  Volume2, 
  VolumeX, 
  Music, 
  LogOut,
  Cpu
} from "lucide-react";

// Custom scrollbar styles for the entire sidebar
const scrollbarStyles = `
  .sidebar-container::-webkit-scrollbar {
    width: 8px;
  }
  .sidebar-container::-webkit-scrollbar-track {
    background: #0d0d0e;
  }
  .sidebar-container::-webkit-scrollbar-thumb {
    background: #ff3300;
    border-radius: 4px;
  }
  .sidebar-container::-webkit-scrollbar-thumb:hover {
    background: #ff5533;
  }
`;

interface GlassSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const GlassSidebar = React.memo(function GlassSidebar({ isOpen = false, onClose }: GlassSidebarProps) {
  const user = useAppStore((s) => s.user);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const logout = useAppStore((s) => s.logout);
  const isSoundPlaying = useAppStore((s) => s.isSoundPlaying);
  const toggleSound = useAppStore((s) => s.toggleSound);
  const activeSoundTrack = useAppStore((s) => s.activeSoundTrack);
  const setSoundTrack = useAppStore((s) => s.setSoundTrack);
  const aiRuntime = useAppStore((s) => s.aiRuntime);

  const [synthVolume, setSynthVolume] = useState(0.2);
  
  // Audio Synth Context Ref for Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<any[]>([]);

  // Soundscape Synth generator utilizing Web Audio API oscillators
  // Creates infinite, zero-bandwidth, beautiful ambient washes offline
  const startSynth = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Stop any existing oscillators
      stopSynth();

      // Master Gain Node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(synthVolume * 0.15, ctx.currentTime);
      masterGain.connect(ctx.destination);
      synthNodesRef.current.push(masterGain);

      if (activeSoundTrack === "lofi") {
        // Binaural beat focus synth (Low deep hums)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(110, ctx.currentTime); // A2 Note
        
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(110.5, ctx.currentTime); // Binaural beat delta
        
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(180, ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(masterGain);
        
        osc1.start();
        osc2.start();
        
        synthNodesRef.current.push(osc1, osc2, filter);
        
      } else if (activeSoundTrack === "ocean") {
        // Ocean Wave noise generator using a bandpass sweep
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.setValueAtTime(2.0, ctx.currentTime);

        // LFO (Low Frequency Oscillator) to animate filter sweep (simulate waves rolling)
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // 12 seconds per wave

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(400, ctx.currentTime); // sweep range

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency); // Modulate filter cutoff

        whiteNoise.connect(filter);
        filter.connect(masterGain);

        lfo.start();
        whiteNoise.start();

        synthNodesRef.current.push(whiteNoise, filter, lfo, lfoGain);
        
      } else if (activeSoundTrack === "rain") {
        // Rain Synth (Soft hiss with crackle impulses)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();

        synthNodesRef.current.push(whiteNoise, filter);
      }
      
    } catch (e) {
      console.error("Web Audio API not supported or blocked:", e);
    }
  };

  const stopSynth = () => {
    synthNodesRef.current.forEach(node => {
      try {
        node.stop();
      } catch (e) {
        // Node might not have stop method (like filters or gains)
      }
      try {
        node.disconnect();
      } catch (e) {}
    });
    synthNodesRef.current = [];
  };

  // Sync synth playback with state changes
  useEffect(() => {
    if (isSoundPlaying) {
      startSynth();
    } else {
      stopSynth();
    }
    return () => stopSynth();
  }, [isSoundPlaying, activeSoundTrack]);

  // Adjust volume dynamically
  useEffect(() => {
    if (synthNodesRef.current.length > 0 && isSoundPlaying) {
      // Index 0 is always master gain
      const gainNode = synthNodesRef.current[0];
      if (gainNode && gainNode.gain) {
        gainNode.gain.setValueAtTime(synthVolume * 0.15, audioCtxRef.current?.currentTime || 0);
      }
    }
  }, [synthVolume, isSoundPlaying]);

  const providerLabel = aiRuntime?.primary_provider || aiRuntime?.active_provider || "offline";
  const lastProvider = aiRuntime?.last_success_provider;
  const fallbackWasUsed = Boolean(
    aiRuntime?.primary_provider &&
    lastProvider &&
    lastProvider !== aiRuntime.primary_provider &&
    lastProvider !== "offline"
  );
  const primaryModel = aiRuntime?.providers?.find((provider) => provider.name === providerLabel)?.model;
  const providerColor = providerLabel === "offline" ? "text-amber-400" : "text-emerald-400";

  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "translator", label: "Overthink Translator", icon: HelpCircle },
    { id: "replies", label: "Reply Generator", icon: MessageSquareReply },
    { id: "decisions", label: "Decision Engine", icon: Activity },
    { id: "journal", label: "Venting Journal", icon: BookOpen },
    { id: "social", label: "Social Confidence", icon: Users },
    { id: "burnout", label: "Burnout Monitor", icon: Zap },
  ] as const;

  return (
    <>
      <style>{scrollbarStyles}</style>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/75 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <div 
        className={`w-80 max-w-[85vw] md:max-w-none h-full md:h-screen bg-[#0d0d0e] border-r border-[#1d1d1f] overflow-y-auto sidebar-container flex flex-col p-6 shrink-0 fixed inset-y-0 left-0 z-50 md:static md:z-30 select-none transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#ff3300 #0d0d0e'
        }}
      >
        {/* App Title */}
        <div className="flex items-center gap-3 mb-10 pb-4 border-b border-[#1d1d1f]">
          <div className="w-7 h-7 border border-[#ff3300] flex items-center justify-center">
            <span className="font-mono text-xs font-bold text-[#ff3300] tracking-wider">M</span>
          </div>
          <div>
            <h1 className="font-sans font-extrabold text-sm tracking-tight uppercase text-[#f2efea]">MindEase</h1>
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-[#ff3300] block mt-0.5">COGNITIVE SANC</span>
          </div>
        </div>

        {/* User profile card */}
        {user && (
          <div className="bg-[#141416] p-4 border border-[#1d1d1f] mb-8 flex items-center gap-3">
            <div className="w-8 h-8 bg-transparent border border-[#2d2d30] flex items-center justify-center font-mono font-bold text-[#ff3300]">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase text-[#f2efea]">{user.username}</p>
              <p className="font-mono text-[9px] font-bold text-[#ff3300] uppercase mt-0.5">{user.active_personality}</p>
            </div>
          </div>
        )}

        {/* Focus Mode Selector */}
        <FocusModeSelector />

        {/* Sidebar Nav */}
        <nav className="space-y-1 mb-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-mono uppercase tracking-wider transition-colors border ${
                  isActive 
                    ? "border-[#ff3300] text-[#ff3300] bg-[#ff3300]/5"
                    : "text-[#93928e] border-transparent hover:text-[#f2efea] hover:bg-[#141416]"
                }`}
              >
                <Icon size={13} className={isActive ? "text-[#ff3300]" : "text-[#93928e]"} />
                {item.label}
              </button>
            );
          })}
        </nav>
        {/* Ambient Soundscapes Widget */}
        <div className="bg-[#141416] p-4 border border-[#1d1d1f] space-y-2">
          <div className="flex items-center gap-2">
            <Cpu size={12} className={providerColor} />
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#93928e]">AI Runtime</span>
          </div>
          <div className="flex justify-between items-center font-mono text-[8px] uppercase">
            <span className={providerColor}>{providerLabel} active</span>
            <span className="text-[#575653]">{primaryModel || aiRuntime?.active_model || "local-fallback"}</span>
          </div>
          <div className="flex justify-between items-center font-mono text-[8px] uppercase text-[#575653]">
            <span>Backup</span>
            <span>{aiRuntime?.backup_provider || "none"}</span>
          </div>
          {fallbackWasUsed && (
            <div className="font-mono text-[8px] uppercase text-amber-400">
              Last generation used {lastProvider} fallback
            </div>
          )}
        </div>

        {/* Ambient Soundscapes Widget */}
        <div className="bg-[#141416] p-4 border border-[#1d1d1f] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music size={12} className="text-[#ff3300]" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#93928e]">Focus Soundscape</span>
            </div>
            <button
              onClick={toggleSound}
              className={`p-1.5 border transition-all cursor-pointer ${
                isSoundPlaying 
                  ? "bg-[#ff3300]/10 border-[#ff3300] text-[#ff3300]" 
                  : "bg-transparent border-[#2d2d30] text-[#93928e] hover:text-[#f2efea]"
              }`}
            >
              {isSoundPlaying ? <Volume2 size={12} /> : <VolumeX size={12} />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {(["lofi", "rain", "ocean"] as const).map((track) => (
              <button
                key={track}
                onClick={() => setSoundTrack(track)}
                className={`py-1.5 text-[8px] font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                  activeSoundTrack === track 
                    ? "bg-[#ff3300]/10 border-[#ff3300] text-[#ff3300]" 
                    : "bg-transparent border-[#2d2d30] text-[#575653] hover:text-[#93928e]"
                }`}
              >
                {track}
              </button>
            ))}
          </div>

          {isSoundPlaying && (
            <div className="space-y-2 pt-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={synthVolume}
                onChange={(e) => setSynthVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#2d2d30] appearance-none cursor-pointer accent-[#ff3300]"
              />
              <div className="flex justify-between font-mono text-[8px] text-[#575653]">
                <span>VOL</span>
                <span>{Math.round(synthVolume * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-[#ff3300]/20 hover:border-[#ff3300] text-[9px] font-mono uppercase tracking-widest text-[#ff3300] hover:bg-[#ff3300]/5 transition-colors cursor-pointer"
        >
          <LogOut size={12} />
          Release Session
        </button>
      </div>
    </>
  );
});

export default GlassSidebar;
