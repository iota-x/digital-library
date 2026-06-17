"use client";
import { useState, useEffect } from "react";
import LandingPage from "@/components/LandingPage";
import { fetchUserData, setUser, useUserData, UserInfo } from "@/lib/userStore";
import { initCalendarStore, ensureRealtime } from "@/lib/calendarStore";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const user = useUserData();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchUserData().then((u) => {
      // Open the shared realtime relay on every authenticated page load —
      // not just fresh logins — so presence / doodle / daily / watch-together
      // work even on routes that never fetch the calendar (e.g. /shared).
      if (u?.coupleId) ensureRealtime(u.coupleId);
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  if (user) return <>{children}</>;

  return (
    <LandingPage
      onSuccess={(u: UserInfo) => {
        setUser(u);
        initCalendarStore(u.coupleId);
      }}
    />
  );
}
