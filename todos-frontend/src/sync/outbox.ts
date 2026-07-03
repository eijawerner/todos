import { Op, OpResult } from "./opTypes";
import { postOps as realPostOps } from "../api/opsApi";

// The outbox is the single write path: every mutation (online or offline) is
// enqueued here, persisted to localStorage, and drained to POST /api/ops by a
// flusher that retries with backoff. Rendering reads the pending ops via
// useOutbox + applyOps. Built as a factory so tests inject fake deps.

const STORAGE_KEY = "todos.outbox.v1";
const MAX_BATCH = 100;
const RETRY_DELAYS = [2000, 5000, 15000, 30000];
const COALESCE_TYPES: Op["type"][] = ["setText", "setChecked", "move", "setNote"];

export type OutboxStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type OutboxDeps = {
  storage: OutboxStorage;
  postOps: (ops: Op[]) => Promise<OpResult[]>;
  isOnline: () => boolean;
};

export type Outbox = ReturnType<typeof createOutbox>;

export function createOutbox({ storage, postOps, isOnline }: OutboxDeps) {
  let ops: Op[] = load();
  const listeners = new Set<() => void>();
  let flushing = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let retryIdx = 0;
  let onFlushed: ((results: OpResult[]) => void) | null = null;
  let onOpsRejected: ((rejected: OpResult[]) => void) | null = null;

  function load(): Op[] {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Op[]) : [];
    } catch {
      return [];
    }
  }

  function persist() {
    try {
      if (ops.length === 0) storage.removeItem(STORAGE_KEY);
      else storage.setItem(STORAGE_KEY, JSON.stringify(ops));
    } catch {
      // storage unavailable/quota: keep going with in-memory ops
    }
  }

  function setOps(next: Op[]) {
    ops = next;
    persist();
    listeners.forEach((l) => l());
  }

  function clearFlushTimer() {
    if (flushTimer != null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  function scheduleFlush(delay: number) {
    clearFlushTimer();
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, delay);
  }

  async function flush() {
    if (flushing || !isOnline()) return;
    const batch = ops.slice(0, MAX_BATCH);
    if (batch.length === 0) return;

    flushing = true;
    try {
      const results = await postOps(batch);
      const acked = new Set(results.map((r) => r.opId));
      // Every op that came back with a status is done (applied/noop/duplicate/
      // rejected). A transient failure throws instead, keeping the batch.
      setOps(ops.filter((op) => !acked.has(op.opId)));
      retryIdx = 0;

      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length && onOpsRejected) onOpsRejected(rejected);
      if (onFlushed) onFlushed(results);

      flushing = false;
      if (ops.length > 0) scheduleFlush(0); // more than one batch pending
    } catch {
      flushing = false;
      const delay = RETRY_DELAYS[Math.min(retryIdx, RETRY_DELAYS.length - 1)];
      retryIdx += 1;
      scheduleFlush(delay);
    }
  }

  function enqueue(op: Op) {
    let next: Op[];
    if (op.type === "deleteTodo") {
      // If the todo was only ever added locally, the add and the delete cancel
      // out and nothing is sent. Otherwise drop pending edits and send the
      // delete (delete-wins).
      const hadPendingAdd = ops.some((o) => o.todoId === op.todoId && o.type === "addTodo");
      next = ops.filter((o) => o.todoId !== op.todoId);
      if (!hadPendingAdd) next.push(op);
    } else if (COALESCE_TYPES.includes(op.type)) {
      // Repeated same-field edits to the same todo replace the pending op in
      // place (rapid typing => one setText).
      const idx = ops.findIndex((o) => o.todoId === op.todoId && o.type === op.type);
      next = [...ops];
      if (idx >= 0) next[idx] = op;
      else next.push(op);
    } else {
      next = [...ops, op];
    }
    setOps(next);
    scheduleFlush(0);
  }

  // Remove a not-yet-flushed op (e.g. undo cancelling a pending delete).
  function cancelOp(opId: string) {
    setOps(ops.filter((o) => o.opId !== opId));
  }

  return {
    enqueue,
    cancelOp,
    flush,
    // useSyncExternalStore reads: getSnapshot returns a stable reference until
    // ops actually change.
    getSnapshot: () => ops,
    getOps: (listName?: string) =>
      listName == null ? ops : ops.filter((o) => o.listName === listName),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isEmpty: () => ops.length === 0,
    // Called on the browser's "online" event: reset backoff and drain now.
    notifyOnline: () => {
      retryIdx = 0;
      scheduleFlush(0);
    },
    setOnFlushed: (cb: (results: OpResult[]) => void) => {
      onFlushed = cb;
    },
    setOnOpsRejected: (cb: (rejected: OpResult[]) => void) => {
      onOpsRejected = cb;
    },
    _resetForTests: () => {
      clearFlushTimer();
      flushing = false;
      retryIdx = 0;
      onFlushed = null;
      onOpsRejected = null;
      setOps([]);
    },
  };
}

// ---- app singleton ----

function memoryStorage(): OutboxStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}

export const outbox = createOutbox({
  storage: typeof localStorage !== "undefined" ? localStorage : memoryStorage(),
  postOps: realPostOps,
  isOnline: () => (typeof navigator !== "undefined" ? navigator.onLine : true),
});

if (typeof window !== "undefined") {
  window.addEventListener("online", () => outbox.notifyOnline());
}

export function resetOutboxForTests() {
  outbox._resetForTests();
}
