"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserInfo } from "@/lib/userStore";
import { DEFAULT_SETTINGS } from "@/lib/themes";
import { DEFAULT_START_DATE } from "@/lib/relationship";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

type Mode = "create" | "join" | "signin" | "forgot" | "verify";

interface LandingPageProps {
  onSuccess: (user: UserInfo) => void;
}

const FLOATERS = ["🌸","💗","🩷","✨","🌷","💕","💫","🌙","⭐","🌸","💗","🩷"];

function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: 10,
    border: `1.5px solid ${hasError ? "#f43f5e" : "rgba(249,168,212,0.6)"}`,
    outline: "none",
    background: "rgba(255,255,255,0.8)",
    fontFamily: SANS,
    fontSize: "0.92rem",
    color: "#4a1628",
    boxSizing: "border-box" as const,
    marginBottom: "0.9rem",
    transition: "border-color 0.2s",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    fontFamily: SANS,
    fontSize: "0.68rem",
    color: "rgba(190,24,93,0.55)",
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    margin: "0 0 0.3rem",
    display: "block",
  };
}

function InviteCodeDisplay({ code, onDone }: { code: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      style={{ textAlign: "center" }}
    >
      <motion.div
        style={{ fontSize: "3rem", marginBottom: "1rem" }}
        animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }}
        transition={{ repeat: Infinity, duration: 2.2 }}
      >
        🎉
      </motion.div>
      <h2 style={{ fontFamily: SERIF, fontStyle: "italic", color: "#be185d", fontSize: "1.5rem", margin: "0 0 0.4rem" }}>
        Your space is ready!
      </h2>
      <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "rgba(190,24,93,0.6)", margin: "0 0 1.5rem" }}>
        Share this invite code with your partner so they can join
      </p>

      {/* Big invite code card */}
      <div style={{
        background: "linear-gradient(135deg,rgba(249,168,212,0.2),rgba(236,72,153,0.1))",
        border: "2px solid rgba(249,168,212,0.5)",
        borderRadius: 20,
        padding: "1.5rem",
        marginBottom: "1.2rem",
      }}>
        <p style={{ fontFamily: SANS, fontSize: "0.65rem", color: "rgba(190,24,93,0.5)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 0.6rem" }}>
          invite code
        </p>
        <p style={{
          fontFamily: SERIF,
          fontSize: "2.5rem",
          color: "#be185d",
          margin: "0 0 1rem",
          letterSpacing: "0.35em",
          fontWeight: 700,
          textShadow: "0 2px 12px rgba(190,24,93,0.2)",
        }}>
          {code}
        </p>
        <motion.button
          onClick={copy}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          style={{
            padding: "0.6rem 1.5rem",
            borderRadius: 50,
            border: "1.5px solid rgba(190,24,93,0.3)",
            background: copied ? "linear-gradient(135deg,#86efac,#4ade80)" : "transparent",
            color: copied ? "#fff" : "#be185d",
            fontFamily: SANS,
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "all 0.3s",
          }}
        >
          {copied ? "✓ copied!" : "copy code"}
        </motion.button>
      </div>

      <motion.button
        onClick={onDone}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: "100%",
          padding: "0.9rem",
          borderRadius: 50,
          border: "none",
          background: "linear-gradient(135deg,#f9a8d4,#ec4899)",
          color: "#fff",
          fontFamily: SCRIPT,
          fontSize: "1.2rem",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(236,72,153,0.35)",
        }}
      >
        {"let's go 🌸"}
      </motion.button>
    </motion.div>
  );
}

export default function LandingPage({ onSuccess }: LandingPageProps) {
  const [mode, setMode] = useState<Mode>("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create fields
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirm, setCreateConfirm] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<UserInfo | null>(null);

  // Join fields
  const [joinName, setJoinName] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Signin fields
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  // Forgot-password flow
  const [forgotEmail,    setForgotEmail]    = useState("");
  const [forgotCode,     setForgotCode]     = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotStep,     setForgotStep]     = useState<"email" | "reset" | "done">("email");
  const [info, setInfo] = useState("");

  // Email verification flow (after register / join)
  const [verifyCode,      setVerifyCode]    = useState("");
  const [verifyPending,   setVerifyPending] = useState<UserInfo | null>(null);
  const [verifyInvite,    setVerifyInvite]  = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const handleCreate = async () => {
    setError("");
    if (!createName.trim() || !createEmail.trim() || !createPassword || !createStartDate) {
      setError("Please fill in all fields");
      return;
    }
    if (createPassword !== createConfirm) {
      setError("Passwords do not match");
      return;
    }
    if (createPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          startDate: createStartDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      // Fetch user info, then route to verification step
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.ok) {
        const user: UserInfo = {
          userId: meData.userId,
          coupleId: meData.coupleId,
          name: meData.name,
          role: meData.role,
          partnerName: meData.partnerName ?? null,
          avatarUrl: meData.avatarUrl ?? null,
          partnerAvatarUrl: meData.partnerAvatarUrl ?? null,
          inviteCode: meData.inviteCode ?? data.inviteCode,
          startDate: meData.startDate ?? createStartDate,
          settings: meData.settings ?? DEFAULT_SETTINGS,
        };
        setVerifyPending(user);
        setVerifyInvite(data.inviteCode ?? null);
        setMode("verify");
        setInfo(`We sent a 6-digit code to ${createEmail.trim()}. Enter it to finish setting up your space.`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setError("");
    if (!joinName.trim() || !joinEmail.trim() || !joinPassword || !joinCode.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (joinPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: joinName.trim(),
          email: joinEmail.trim(),
          password: joinPassword,
          inviteCode: joinCode.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to join");
        return;
      }
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.ok) {
        const user: UserInfo = {
          userId: meData.userId,
          coupleId: meData.coupleId,
          name: meData.name,
          role: meData.role,
          partnerName: meData.partnerName ?? null,
          avatarUrl: meData.avatarUrl ?? null,
          partnerAvatarUrl: meData.partnerAvatarUrl ?? null,
          inviteCode: meData.inviteCode ?? null,
          startDate: meData.startDate ?? DEFAULT_START_DATE,
          settings: meData.settings ?? DEFAULT_SETTINGS,
        };
        setVerifyPending(user);
        setMode("verify");
        setInfo(`We sent a 6-digit code to ${joinEmail.trim()}. Enter it to join your space.`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async () => {
    setError("");
    if (!signinEmail.trim() || !signinPassword) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signinEmail.trim(), password: signinPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.ok) {
        onSuccess({
          userId: meData.userId,
          coupleId: meData.coupleId,
          name: meData.name,
          role: meData.role,
          partnerName: meData.partnerName ?? null,
          avatarUrl: meData.avatarUrl ?? null,
          partnerAvatarUrl: meData.partnerAvatarUrl ?? null,
          inviteCode: meData.inviteCode ?? null,
          startDate: meData.startDate ?? DEFAULT_START_DATE,
          settings: meData.settings ?? DEFAULT_SETTINGS,
        });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(""); setInfo("");
    if (!verifyCode.trim()) { setError("Enter the code from your email"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Invalid code"); return; }
      if (verifyPending) {
        // Mark this as a fresh account so the Onboarding component shows after entry
        try { localStorage.removeItem("ann_onboarded_v1"); } catch {}
        if (verifyInvite && verifyPending.role === "creator") {
          setInviteCode(verifyInvite); setPendingUser(verifyPending);
        } else {
          onSuccess(verifyPending);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const handleResendCode = async () => {
    setError(""); setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", { method: "PUT" });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Couldn't resend code"); return; }
      setInfo("New code sent — check your email.");
    } catch { setError("Couldn't resend the code."); }
    finally { setLoading(false); }
  };

  const handleForgotRequest = async () => {
    setError(""); setInfo("");
    if (!forgotEmail.trim()) { setError("Enter your email"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't send code"); return; }
      setInfo("If that email is registered, we sent a 6-digit code to it.");
      setForgotStep("reset");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const handleForgotReset = async () => {
    setError(""); setInfo("");
    if (!forgotCode.trim() || !forgotPassword) { setError("Fill in both fields"); return; }
    if (forgotPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), code: forgotCode.trim(), password: forgotPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Couldn't reset password"); return; }
      setForgotStep("done");
      setInfo("Password updated — you can sign in now.");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (mode === "create") handleCreate();
      else if (mode === "join") handleJoin();
      else if (mode === "verify") handleVerify();
      else if (mode === "forgot") {
        if (forgotStep === "email") handleForgotRequest();
        else if (forgotStep === "reset") handleForgotReset();
      }
      else handleSignin();
    }
  };

  const tabStyle = (m: Mode): React.CSSProperties => ({
    padding: "0.45rem 1.1rem",
    borderRadius: 50,
    border: "none",
    cursor: "pointer",
    fontFamily: SANS,
    fontSize: "0.8rem",
    fontWeight: mode === m ? 700 : 500,
    background: mode === m ? "linear-gradient(135deg,#f9a8d4,#ec4899)" : "transparent",
    color: mode === m ? "#fff" : "rgba(190,24,93,0.6)",
    boxShadow: mode === m ? "0 2px 12px rgba(236,72,153,0.3)" : "none",
    transition: "all 0.25s",
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#fff1f2 0%,#fce7f3 50%,#fdf2f8 100%)",
        overflow: "hidden",
        padding: "1.5rem",
      }}
    >
      {/* Falling floaters */}
      {FLOATERS.map((sym, i) => (
        <motion.span key={i} style={{
          position: "absolute",
          left: `${(i * 8.5) % 100}%`,
          top: -40, fontSize: `${14 + (i % 3) * 5}px`,
          pointerEvents: "none", userSelect: "none",
        }}
          animate={{ y: "110vh", rotate: 360, opacity: [0, 0.7, 0] }}
          transition={{ duration: 8 + i * 0.6, delay: i * 0.8, repeat: Infinity, ease: "linear" }}
        >
          {sym}
        </motion.span>
      ))}

      {/* Ambient glow orbs */}
      {[
        { l:"10%", t:"15%", w:300, c:"rgba(249,168,212,0.25)" },
        { l:"65%", t:"10%", w:250, c:"rgba(253,186,213,0.2)" },
        { l:"70%", t:"65%", w:280, c:"rgba(244,114,182,0.15)" },
        { l:"5%",  t:"65%", w:220, c:"rgba(251,207,232,0.22)" },
      ].map((o,i) => (
        <motion.div key={i} style={{
          position:"absolute", left:o.l, top:o.t,
          width:o.w, height:o.w, borderRadius:"50%",
          background:o.c, filter:"blur(50px)", pointerEvents:"none",
        }}
          animate={{ scale:[1,1.3,1], opacity:[0.5,0.9,0.5] }}
          transition={{ repeat:Infinity, duration:5+i, delay:i*1.2, ease:"easeInOut" }}
        />
      ))}

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative", zIndex: 2,
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(249,168,212,0.4)",
          borderRadius: 24,
          padding: "clamp(2rem,5vw,3rem) clamp(1.5rem,4vw,2.5rem)",
          width: "100%", maxWidth: 440,
          boxShadow: "0 20px 60px rgba(244,114,182,0.18), 0 2px 8px rgba(0,0,0,0.06)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Heart logo */}
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <motion.div
            style={{ fontSize: "2.8rem", display: "inline-block", filter: "drop-shadow(0 0 12px rgba(244,114,182,0.6))" }}
            animate={{ scale: [1, 1.15, 1], rotate: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          >
            💗
          </motion.div>
          <h1 style={{
            fontFamily: SERIF, fontStyle: "italic",
            fontSize: "clamp(1.3rem,3.5vw,1.7rem)",
            color: "#be185d", margin: "0.4rem 0 0",
          }}>
            just for us 🌸
          </h1>
          <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "rgba(190,24,93,0.6)", margin: "0.2rem 0 0" }}>
            your private little world together
          </p>
        </div>

        {/* If showing invite code after create */}
        <AnimatePresence mode="wait">
          {inviteCode && pendingUser ? (
            <motion.div key="invite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InviteCodeDisplay code={inviteCode} onDone={() => onSuccess(pendingUser)} />
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Tab switcher — hidden during verify/forgot since they're flow-driven */}
              {mode !== "verify" && mode !== "forgot" && (
                <div style={{
                  display: "flex", gap: "0.25rem",
                  background: "rgba(252,231,243,0.6)",
                  border: "1px solid rgba(249,168,212,0.3)",
                  borderRadius: 50,
                  padding: "0.3rem",
                  marginBottom: "1.5rem",
                }}>
                  <button style={tabStyle("create")} onClick={() => switchMode("create")}>create</button>
                  <button style={tabStyle("join")} onClick={() => switchMode("join")}>join</button>
                  <button style={tabStyle("signin")} onClick={() => switchMode("signin")}>sign in</button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {mode === "create" && (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(190,24,93,0.55)", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
                      Create your private space. Share the invite code with your partner to join.
                    </p>
                    <label style={labelStyle()}>your name</label>
                    <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="your name" style={inputStyle()} autoComplete="name" />
                    <label style={labelStyle()}>email</label>
                    <input value={createEmail} onChange={e => setCreateEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputStyle()} autoComplete="email" />
                    <label style={labelStyle()}>password</label>
                    <input value={createPassword} onChange={e => setCreatePassword(e.target.value)} placeholder="at least 6 characters" type="password" style={inputStyle()} autoComplete="new-password" />
                    <label style={labelStyle()}>confirm password</label>
                    <input value={createConfirm} onChange={e => setCreateConfirm(e.target.value)} placeholder="same again" type="password" style={inputStyle()} autoComplete="new-password" />
                    <label style={labelStyle()}>relationship start date</label>
                    <input value={createStartDate} onChange={e => setCreateStartDate(e.target.value)} type="date" style={inputStyle()} />
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        style={{ fontFamily: SANS, color: "#f43f5e", fontSize: "0.85rem", margin: "-0.4rem 0 0.9rem" }}>
                        {error}
                      </motion.p>
                    )}
                    <motion.button onClick={handleCreate} disabled={loading}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{
                        width: "100%", padding: "0.9rem", borderRadius: 50, border: "none",
                        background: "linear-gradient(135deg,#f9a8d4,#ec4899)", color: "#fff",
                        fontFamily: SCRIPT, fontSize: "1.15rem", cursor: loading ? "wait" : "pointer",
                        boxShadow: "0 4px 20px rgba(236,72,153,0.35)", opacity: loading ? 0.7 : 1,
                      }}>
                      {loading ? "creating…" : "create our space 🌸"}
                    </motion.button>
                  </motion.div>
                )}

                {mode === "join" && (
                  <motion.div
                    key="join"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(190,24,93,0.55)", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
                      Got an invite code from your partner? Join their space here.
                    </p>
                    <label style={labelStyle()}>your name</label>
                    <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="your name" style={inputStyle()} autoComplete="name" />
                    <label style={labelStyle()}>email</label>
                    <input value={joinEmail} onChange={e => setJoinEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputStyle()} autoComplete="email" />
                    <label style={labelStyle()}>password</label>
                    <input value={joinPassword} onChange={e => setJoinPassword(e.target.value)} placeholder="at least 6 characters" type="password" style={inputStyle()} autoComplete="new-password" />
                    <label style={labelStyle()}>invite code</label>
                    <input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="XXXXXX"
                      maxLength={6}
                      style={{ ...inputStyle(), letterSpacing: "0.35em", textTransform: "uppercase", fontFamily: SERIF, fontSize: "1.2rem", textAlign: "center" }}
                      autoComplete="off"
                    />
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        style={{ fontFamily: SANS, color: "#f43f5e", fontSize: "0.85rem", margin: "-0.4rem 0 0.9rem" }}>
                        {error}
                      </motion.p>
                    )}
                    <motion.button onClick={handleJoin} disabled={loading}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{
                        width: "100%", padding: "0.9rem", borderRadius: 50, border: "none",
                        background: "linear-gradient(135deg,#f9a8d4,#ec4899)", color: "#fff",
                        fontFamily: SCRIPT, fontSize: "1.15rem", cursor: loading ? "wait" : "pointer",
                        boxShadow: "0 4px 20px rgba(236,72,153,0.35)", opacity: loading ? 0.7 : 1,
                      }}>
                      {loading ? "joining…" : "join our space 💗"}
                    </motion.button>
                  </motion.div>
                )}

                {mode === "signin" && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(190,24,93,0.55)", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
                      Welcome back! Sign in to your space.
                    </p>
                    <label style={labelStyle()}>email</label>
                    <input value={signinEmail} onChange={e => setSigninEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputStyle()} autoComplete="email" />
                    <label style={labelStyle()}>password</label>
                    <input value={signinPassword} onChange={e => setSigninPassword(e.target.value)} placeholder="your password" type="password" style={inputStyle()} autoComplete="current-password" />
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        style={{ fontFamily: SANS, color: "#f43f5e", fontSize: "0.85rem", margin: "-0.4rem 0 0.9rem" }}>
                        {error}
                      </motion.p>
                    )}
                    <motion.button onClick={handleSignin} disabled={loading}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{
                        width: "100%", padding: "0.9rem", borderRadius: 50, border: "none",
                        background: "linear-gradient(135deg,#f9a8d4,#ec4899)", color: "#fff",
                        fontFamily: SCRIPT, fontSize: "1.15rem", cursor: loading ? "wait" : "pointer",
                        boxShadow: "0 4px 20px rgba(236,72,153,0.35)", opacity: loading ? 0.7 : 1,
                      }}>
                      {loading ? "signing in…" : "sign in 🌸"}
                    </motion.button>
                    <button onClick={() => { setMode("forgot"); setError(""); setInfo(""); setForgotStep("email"); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: "0.8rem", color: "rgba(190,24,93,0.6)", marginTop: "0.8rem", textDecoration: "underline", display: "block", marginLeft: "auto", marginRight: "auto" }}>
                      forgot password?
                    </button>
                  </motion.div>
                )}

                {mode === "verify" && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(190,24,93,0.55)", margin: "0 0 1rem", lineHeight: 1.5 }}>
                      {info || "We sent you a 6-digit code. Enter it to confirm your email."}
                    </p>
                    <label style={labelStyle()}>verification code</label>
                    <input value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••" maxLength={6}
                      style={{ ...inputStyle(), letterSpacing: "0.35em", textAlign: "center", fontFamily: SERIF, fontSize: "1.4rem" }} />
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        style={{ fontFamily: SANS, color: "#f43f5e", fontSize: "0.85rem", margin: "-0.4rem 0 0.9rem" }}>
                        {error}
                      </motion.p>
                    )}
                    <motion.button onClick={handleVerify} disabled={loading}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{
                        width: "100%", padding: "0.9rem", borderRadius: 50, border: "none",
                        background: "linear-gradient(135deg,#f9a8d4,#ec4899)", color: "#fff",
                        fontFamily: SCRIPT, fontSize: "1.15rem", cursor: loading ? "wait" : "pointer",
                        boxShadow: "0 4px 20px rgba(236,72,153,0.35)", opacity: loading ? 0.7 : 1,
                      }}>
                      {loading ? "verifying…" : "verify 💗"}
                    </motion.button>
                    <button onClick={handleResendCode} disabled={loading}
                      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: "0.8rem", color: "rgba(190,24,93,0.6)", marginTop: "0.8rem", textDecoration: "underline", display: "block", marginLeft: "auto", marginRight: "auto" }}>
                      resend code
                    </button>
                  </motion.div>
                )}

                {mode === "forgot" && (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {forgotStep === "email" && (
                      <>
                        <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(190,24,93,0.55)", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
                          Enter your email and we&apos;ll send you a code to reset your password.
                        </p>
                        <label style={labelStyle()}>email</label>
                        <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputStyle()} autoComplete="email" />
                        {error && <p style={{ fontFamily: SANS, color: "#f43f5e", fontSize: "0.85rem", margin: "-0.4rem 0 0.9rem" }}>{error}</p>}
                        <motion.button onClick={handleForgotRequest} disabled={loading}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          style={{
                            width: "100%", padding: "0.9rem", borderRadius: 50, border: "none",
                            background: "linear-gradient(135deg,#f9a8d4,#ec4899)", color: "#fff",
                            fontFamily: SCRIPT, fontSize: "1.15rem", cursor: loading ? "wait" : "pointer",
                            boxShadow: "0 4px 20px rgba(236,72,153,0.35)", opacity: loading ? 0.7 : 1,
                          }}>
                          {loading ? "sending…" : "send reset code"}
                        </motion.button>
                      </>
                    )}
                    {forgotStep === "reset" && (
                      <>
                        <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(190,24,93,0.55)", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
                          {info || `Check your inbox for a code, then pick a new password.`}
                        </p>
                        <label style={labelStyle()}>code</label>
                        <input value={forgotCode}
                          onChange={e => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••••" maxLength={6}
                          style={{ ...inputStyle(), letterSpacing: "0.35em", textAlign: "center", fontFamily: SERIF, fontSize: "1.4rem" }} />
                        <label style={labelStyle()}>new password</label>
                        <input value={forgotPassword} onChange={e => setForgotPassword(e.target.value)} placeholder="at least 8 characters" type="password" style={inputStyle()} autoComplete="new-password" />
                        {error && <p style={{ fontFamily: SANS, color: "#f43f5e", fontSize: "0.85rem", margin: "-0.4rem 0 0.9rem" }}>{error}</p>}
                        <motion.button onClick={handleForgotReset} disabled={loading}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          style={{
                            width: "100%", padding: "0.9rem", borderRadius: 50, border: "none",
                            background: "linear-gradient(135deg,#f9a8d4,#ec4899)", color: "#fff",
                            fontFamily: SCRIPT, fontSize: "1.15rem", cursor: loading ? "wait" : "pointer",
                            boxShadow: "0 4px 20px rgba(236,72,153,0.35)", opacity: loading ? 0.7 : 1,
                          }}>
                          {loading ? "resetting…" : "set new password"}
                        </motion.button>
                      </>
                    )}
                    {forgotStep === "done" && (
                      <>
                        <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "#16a34a", margin: "0 0 1.2rem", textAlign: "center", lineHeight: 1.5 }}>
                          ✓ {info || "Password updated."}
                        </p>
                      </>
                    )}
                    <button onClick={() => { setMode("signin"); setError(""); setInfo(""); setForgotStep("email"); setForgotCode(""); setForgotPassword(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: "0.8rem", color: "rgba(190,24,93,0.6)", marginTop: "0.8rem", textDecoration: "underline", display: "block", marginLeft: "auto", marginRight: "auto" }}>
                      back to sign in
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{
          fontFamily: SCRIPT, fontSize: "0.88rem",
          color: "rgba(190,24,93,0.35)", textAlign: "center", marginTop: "1.2rem", marginBottom: 0,
        }}>
          made with 💗 for you
        </p>
      </motion.div>
    </div>
  );
}
