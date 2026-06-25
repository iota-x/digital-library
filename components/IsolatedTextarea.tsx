"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

/* A drop-in <textarea> that keeps the typed text in its OWN local state and only
   pushes up to the parent on a short debounce (and immediately on blur). This
   stops every keystroke from re-rendering a large parent component — the cost
   that was heating up the machine on the calendar/journal editors.

   Commit happens on debounce + blur only (no unmount flush), so a parent that
   discards on cancel — e.g. setEditor(null) / setDraft("") — isn't clobbered by
   a late flush. Every exit path in these editors goes through a button, which
   blurs the field first, so the last edit is always committed before save. */
type Props = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "defaultValue"
> & {
  value: string;
  onCommit: (v: string) => void;
  debounceMs?: number;
};

export default React.memo(function IsolatedTextarea({
  value, onCommit, debounceMs = 250, onBlur, ...rest
}: Props) {
  const [local, setLocal] = useState(value);
  const localRef = useRef(local); localRef.current = local;
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last value we received from / pushed to the parent. Tells a genuine external
  // change (adopt it) apart from the parent echoing back our own committed value
  // or re-rendering for an unrelated reason mid-edit (must not clobber typing).
  const synced = useRef(value);

  useEffect(() => {
    if (value !== synced.current) { synced.current = value; setLocal(value); }
  }, [value]);

  const commit = useCallback((v: string) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    synced.current = v;
    onCommit(v);
  }, [onCommit]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <textarea
      {...rest}
      value={local}
      onChange={e => {
        const v = e.target.value;
        setLocal(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(v), debounceMs);
      }}
      onBlur={e => { commit(localRef.current); onBlur?.(e); }}
    />
  );
});
