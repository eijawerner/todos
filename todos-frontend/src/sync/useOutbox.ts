import { useMemo, useSyncExternalStore } from "react";
import { outbox } from "./outbox";
import { Op } from "./opTypes";

// Subscribes a component to the pending ops for one list. getSnapshot returns
// the full ops array (stable reference); the per-list filter is memoised so it
// only recomputes when ops or listName change (avoids a re-render loop).
export function useOutbox(listName: string): Op[] {
  const all = useSyncExternalStore(outbox.subscribe, outbox.getSnapshot, outbox.getSnapshot);
  return useMemo(() => all.filter((op) => op.listName === listName), [all, listName]);
}

// Total number of unsent ops across all lists, for a "syncing…" indicator.
const count = () => outbox.getSnapshot().length;
export function useOutboxCount(): number {
  return useSyncExternalStore(outbox.subscribe, count, count);
}
