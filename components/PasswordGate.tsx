"use client";
import { useState, useEffect } from "react";
import LandingPage from "@/components/LandingPage";
import { fetchUserData, setUser, useUserData, UserInfo } from "@/lib/userStore";
import { initCalendarStore } from "@/lib/calendarStore";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const user = useUserData();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchUserData().then(() => setChecked(true));
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
