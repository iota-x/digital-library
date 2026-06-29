"use client";
import { useState, useEffect } from "react";
import { DEFAULT_SETTINGS, type CoupleSettings } from "@/lib/themes";
import { DEFAULT_START_DATE, startDateFrom } from "@/lib/relationship";
import { clearKeys } from "@/lib/crypto";
import type { ServerKeys } from "@/lib/e2ee";

export interface UserInfo {
  userId:      string;
  coupleId:    string;
  name:        string;
  role:        "creator" | "partner";
  partnerName: string | null;
  /** Affectionate name the partner gave the signed-in user. Shown in place of
   *  `name` (for both partners) when `nicknameOn` is true. Null if unset. */
  nickname:    string | null;
  nicknameOn:  boolean;
  /** Nickname the signed-in user gave their partner. Shown in place of
   *  `partnerName` (for both) when `partnerNicknameOn` is true. */
  partnerNickname:   string | null;
  partnerNicknameOn: boolean;
  /** The signed-in user's cropped square avatar (Cloudinary URL) — null if unset. */
  avatarUrl:        string | null;
  /** The partner's avatar — null if they haven't set one. */
  partnerAvatarUrl: string | null;
  inviteCode:  string | null;
  startDate:   string;
  settings:    CoupleSettings;
  /** False only when the account has an unconfirmed email. Optional/undefined
   *  is treated as verified (legacy accounts, locally-built objects). */
  emailVerified?: boolean;
}

let _user: UserInfo | null = null;
const _listeners: Set<(u: UserInfo | null) => void> = new Set();

// E2EE key material for the signed-in user, returned by /api/auth/me. Kept in
// memory only (never persisted to localStorage) — used by the unlock flow which
// needs the password to actually derive the data key. See lib/e2ee.ts.
let _serverKeys: ServerKeys | null = null;
let _hasRegrantBlob = false;
let _needsRegrant = false;
export function getServerKeys(): ServerKeys | null { return _serverKeys; }
export function getHasRegrantBlob(): boolean { return _hasRegrantBlob; }
export function getNeedsRegrant(): boolean { return _needsRegrant; }

// Cache the last-known user so a returning visitor's themed app paints
// instantly (optimistic) while /api/auth/me revalidates in the background —
// instead of a blank, default-themed screen for the duration of that fetch.
const CACHE_KEY = "ann_user_v1";
function persist(u: UserInfo | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(CACHE_KEY);
  } catch {}
}

function notify(u: UserInfo | null) { _listeners.forEach(fn => fn(u)); }

/** Populate `_user` from the localStorage cache (client only). Used by
 *  PasswordGate to render optimistically before the network check returns.
 *  No-op once a user is already loaded. */
export function hydrateUserFromCache(): UserInfo | null {
  if (typeof window === "undefined" || _user) return _user;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) { _user = JSON.parse(raw) as UserInfo; notify(_user); }
  } catch {}
  return _user;
}

export async function fetchUserData(): Promise<UserInfo | null> {
  try {
    const res  = await fetch("/api/auth/me");
    const data = await res.json();
    // Explicit "not authenticated" — clear cache and log out locally.
    if (!data.ok) {
      _user = null; _serverKeys = null; _hasRegrantBlob = false; _needsRegrant = false;
      clearKeys(); persist(null); notify(null); return null;
    }
    // Stash E2EE key material (in memory only) for the unlock flow.
    _serverKeys = data.keys ?? null;
    _hasRegrantBlob = data.hasRegrantBlob === true;
    _needsRegrant = data.needsRegrant === true;
    const u: UserInfo = {
      userId:      data.userId,
      coupleId:    data.coupleId,
      name:        data.name,
      role:        data.role,
      partnerName: data.partnerName ?? null,
      nickname:          data.nickname          ?? null,
      nicknameOn:        data.nicknameOn         === true,
      partnerNickname:   data.partnerNickname    ?? null,
      partnerNicknameOn: data.partnerNicknameOn  === true,
      avatarUrl:        data.avatarUrl        ?? null,
      partnerAvatarUrl: data.partnerAvatarUrl ?? null,
      inviteCode:  data.inviteCode  ?? null,
      startDate:   data.startDate   ?? DEFAULT_START_DATE,
      settings:    data.settings    ?? DEFAULT_SETTINGS,
      emailVerified: data.emailVerified !== false,
    };
    _user = u; persist(u); notify(u); return u;
  } catch {
    // Network/transient error — keep the cached session rather than bouncing
    // a logged-in user to the landing page on a flaky connection.
    return _user;
  }
}

export function setUser(u: UserInfo): void        { _user = u; persist(u); notify(u); }
export function clearUserData(): void              {
  _user = null; _serverKeys = null; _hasRegrantBlob = false; _needsRegrant = false;
  clearKeys(); persist(null); notify(null);
}
/** Synchronous read of the current user — for non-React modules (SSE filters,
 *  presence store) that need the userId without subscribing to a hook. */
export function getUser(): UserInfo | null         { return _user; }
export function getStartDate(): Date               { return startDateFrom(_user?.startDate); }

export function updateSettings(settings: CoupleSettings): void {
  if (!_user) return;
  _user = { ..._user, settings };
  persist(_user); notify(_user);
}

export function updateUserData(updates: Partial<UserInfo>): void {
  if (!_user) return;
  _user = { ..._user, ...updates };
  persist(_user); notify(_user);
}

/** Update an avatar locally. `which: "me"` for the current user, `"partner"`
 *  when an `avatar:update` SSE event arrives from the other person. */
export function updateAvatar(which: "me" | "partner", url: string | null): void {
  if (!_user) return;
  _user = which === "me"
    ? { ..._user, avatarUrl: url }
    : { ..._user, partnerAvatarUrl: url };
  persist(_user); notify(_user);
}

/** The name to *show* for the signed-in user — their nickname if the partner
 *  set one and it's switched on, otherwise their given name. Use this for any
 *  user-facing label; keep `name` for identity checks (e.g. isAnkitJuhi). */
export function displayName(u: UserInfo | null | undefined): string {
  if (!u) return "";
  return u.nicknameOn && u.nickname ? u.nickname : u.name;
}

/** The name to *show* for the partner — nickname (set by the signed-in user) if
 *  switched on, otherwise their given name. */
export function partnerDisplayName(u: UserInfo | null | undefined): string {
  if (!u) return "";
  return u.partnerNicknameOn && u.partnerNickname ? u.partnerNickname : (u.partnerName ?? "");
}

export function useUserData(): UserInfo | null {
  const [user, setUserState] = useState<UserInfo | null>(_user);
  useEffect(() => {
    setUserState(_user);
    const handler = (u: UserInfo | null) => setUserState(u);
    _listeners.add(handler);
    return () => { _listeners.delete(handler); };
  }, []);
  return user;
}
