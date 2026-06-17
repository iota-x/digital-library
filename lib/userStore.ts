"use client";
import { useState, useEffect } from "react";
import { DEFAULT_SETTINGS, type CoupleSettings } from "@/lib/themes";
import { DEFAULT_START_DATE, startDateFrom } from "@/lib/relationship";

export interface UserInfo {
  userId:      string;
  coupleId:    string;
  name:        string;
  role:        "creator" | "partner";
  partnerName: string | null;
  inviteCode:  string | null;
  startDate:   string;
  settings:    CoupleSettings;
}

let _user: UserInfo | null = null;
const _listeners: Set<(u: UserInfo | null) => void> = new Set();

function notify(u: UserInfo | null) { _listeners.forEach(fn => fn(u)); }

export async function fetchUserData(): Promise<UserInfo | null> {
  try {
    const res  = await fetch("/api/auth/me");
    const data = await res.json();
    if (!data.ok) { _user = null; notify(null); return null; }
    const u: UserInfo = {
      userId:      data.userId,
      coupleId:    data.coupleId,
      name:        data.name,
      role:        data.role,
      partnerName: data.partnerName ?? null,
      inviteCode:  data.inviteCode  ?? null,
      startDate:   data.startDate   ?? DEFAULT_START_DATE,
      settings:    data.settings    ?? DEFAULT_SETTINGS,
    };
    _user = u; notify(u); return u;
  } catch {
    _user = null; notify(null); return null;
  }
}

export function setUser(u: UserInfo): void        { _user = u; notify(u); }
export function clearUserData(): void              { _user = null; notify(null); }
/** Synchronous read of the current user — for non-React modules (SSE filters,
 *  presence store) that need the userId without subscribing to a hook. */
export function getUser(): UserInfo | null         { return _user; }
export function getStartDate(): Date               { return startDateFrom(_user?.startDate); }

export function updateSettings(settings: CoupleSettings): void {
  if (!_user) return;
  _user = { ..._user, settings };
  notify(_user);
}

export function updateUserData(updates: Partial<UserInfo>): void {
  if (!_user) return;
  _user = { ..._user, ...updates };
  notify(_user);
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
