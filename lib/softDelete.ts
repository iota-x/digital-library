"use client";
import { useToast } from "@/components/Toaster";

/**
 * Builds a "soft delete" function: optimistically removes from cache, shows a
 * toast with "Undo". If user undoes, restore. Otherwise after 5s commit the
 * server delete.
 *
 * The store is generic but must support `setCache(items[])` and provide the
 * current array via `currentItems`. We deliberately *do not* call the server
 * until the toast expires — that way "Undo" is free (zero round trips).
 */
export function useSoftDelete<T>() {
  const { toast } = useToast();

  return function softDelete(opts: {
    /** Current array — to restore on undo */
    currentItems: T[];
    /** Apply a new array to the local cache */
    setCache: (next: T[]) => void;
    /** Predicate selecting which items to delete */
    predicate: (item: T) => boolean;
    /** Server delete call — invoked after the undo window expires */
    commit: () => Promise<void> | void;
    /** Toast copy */
    toastMessage: string;
    toastTitle?: string;
    /** Time before commit, in ms. Default 5000. */
    delayMs?: number;
  }): Promise<void> {
    return new Promise(resolve => {
      const previous = [...opts.currentItems];
      // 1. Optimistic remove
      opts.setCache(opts.currentItems.filter(x => !opts.predicate(x)));

      let undone = false;
      const delay = opts.delayMs ?? 5000;

      // 2. Schedule the real commit
      const timer = setTimeout(async () => {
        if (undone) return;
        try { await opts.commit(); } catch {}
        resolve();
      }, delay);

      // 3. Show toast with Undo
      toast({
        title: opts.toastTitle,
        message: opts.toastMessage,
        durationMs: delay,
        variant: "info",
        action: {
          label: "Undo",
          onClick: () => {
            undone = true;
            clearTimeout(timer);
            opts.setCache(previous);
            resolve();
          },
        },
      });
    });
  };
}
