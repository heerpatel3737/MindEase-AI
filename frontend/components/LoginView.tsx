"use client";

import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

export default function LoginView() {
  const login = useAppStore((s) => s.login);
  const register = useAppStore((s) => s.register);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setInlineError("");
    setIsLoading(true);

    if (isLogin) {
      const success = await login(username, password, remember);
      if (!success) {
        setInlineError("Login failed. Please check your credentials or backend connection.");
      }
      setIsLoading(false);
    } else {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[^A-Za-z0-9]/.test(password);

      if (password.length < 8 || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
        setInlineError("Password must be 8+ characters with uppercase, lowercase, number, and symbol.");
        setIsLoading(false);
        return;
      }

      const success = await register(username, password);
      setIsLoading(false);
      if (success) {
        setIsLogin(true);
        setPassword("");
      } else {
        setInlineError("Registration failed. Please check if username is taken or retry.");
      }
    }
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    setInlineError("");
    setPassword("");
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[#070708] overflow-hidden px-6">

      {/* Editorial layout grid backdrop */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full stroke-[#2d2d30] stroke-[0.5]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="login-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid)" />
        </svg>
      </div>

      {/* Main Login Frame */}
      <div className="w-full max-w-md relative z-10 bg-[#0d0d0e] border border-[#1d1d1f] p-10 flex flex-col">

        {/* Monospace System Header */}
        <div className="flex justify-between items-center mb-8 border-b border-[#1d1d1f] pb-4">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#93928e]">
            SECURE AUTH PROTOCOL
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff3300]">
            // ONLINE
          </span>
        </div>

        {/* Typographic Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tighter uppercase font-sans text-[#f2efea] leading-none mb-2">
            {isLogin ? "RESTORE" : "INITIALIZE"}
            <span className="block text-[#ff3300]">COGNITIVE OS</span>
          </h1>
          <p className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] leading-relaxed mt-4">
            {isLogin
              ? "Re-verify authentication credentials. Load individual mental profile state."
              : "Generate a new user node in the local memory database."}
          </p>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Username */}
          <div className="space-y-2">
            <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">
              Username Alias
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.trimStart())}
              placeholder="e.g. USER_ONE"
              className="w-full px-4 py-3 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono"
            />
          </div>

          {/* Password with show/hide toggle */}
          <div className="space-y-2">
            <label className="font-mono text-[9px] uppercase tracking-widest text-[#93928e] block">
              Security Key
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="w-full px-4 py-3 pr-12 text-xs bg-transparent border border-[#2d2d30] text-[#f2efea] focus:outline-none focus:border-[#ff3300] font-mono"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#575653] hover:text-[#f2efea] transition-colors p-1"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="remember" className="font-mono text-[9px] text-[#93928e]">
              Remember me on this device
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#ff3300] hover:bg-[#f2efea] hover:text-[#070708] transition-colors text-xs font-mono tracking-widest uppercase text-[#ffffff] cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn size={13} />
                Access Sanctuary
              </>
            ) : (
              <>
                <UserPlus size={13} />
                Map Companion Node
              </>
            )}
          </button>
        </form>

        {/* Inline error message */}
        {inlineError && (
          <div className="mt-4 border border-[#ff3300]/40 bg-[#ff3300]/5 p-3">
            <p className="font-mono text-[9px] uppercase tracking-wider text-[#ff3300] leading-relaxed">
              {inlineError}
            </p>
          </div>
        )}

        {/* Toggle Login / Sign Up */}
        <div className="text-center mt-8 pt-4 border-t border-[#1d1d1f]">
          <button
            onClick={handleModeSwitch}
            className="font-mono text-[9px] uppercase tracking-wider text-[#93928e] hover:text-[#ff3300] underline decoration-[#2d2d30] hover:decoration-[#ff3300] transition-colors"
          >
            {isLogin
              ? "Generate New Cognitive Profile"
              : "Return to Credentials Verification"}
          </button>
        </div>
      </div>
    </div>
  );
}
