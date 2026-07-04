import { it, expect, vi, beforeEach } from "vitest";
import { createOutbox, OutboxStorage } from "./outbox";
import { Op, OpResult } from "./opTypes";

function fakeStorage(): OutboxStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

let n = 0;
const op = (over: Partial<Op> & Pick<Op, "type">): Op =>
  ({
    opId: `o${++n}`,
    deviceId: "d",
    deviceName: "D",
    listName: "Trip",
    todoId: "t1",
    clientTs: 0,
    payload: { text: "x" },
    ...over,
  }) as Op;

const applied = (opId: string): OpResult => ({ opId, status: "applied" });

beforeEach(() => {
  n = 0;
});

it("persists enqueued ops to storage and exposes them", () => {
  const storage = fakeStorage();
  const ob = createOutbox({ storage, postOps: vi.fn(), isOnline: () => false });

  ob.enqueue(op({ opId: "o1", type: "setText", payload: { text: "hi" } }));

  expect(ob.getSnapshot().map((o) => o.opId)).toEqual(["o1"]);
  expect(storage.map.get("todos.outbox.v1")).toContain("o1");
});

it("coalesces repeated same-field edits to the same todo", () => {
  const ob = createOutbox({ storage: fakeStorage(), postOps: vi.fn(), isOnline: () => false });

  ob.enqueue(op({ type: "setText", todoId: "t1", payload: { text: "a" } }));
  ob.enqueue(op({ type: "setText", todoId: "t1", payload: { text: "ab" } }));
  ob.enqueue(op({ type: "setText", todoId: "t1", payload: { text: "abc" } }));

  const ops = ob.getSnapshot();
  expect(ops).toHaveLength(1);
  expect((ops[0] as { payload: { text: string } }).payload.text).toBe("abc");
});

it("cancels a pending add against a later delete of the same todo", () => {
  const ob = createOutbox({ storage: fakeStorage(), postOps: vi.fn(), isOnline: () => false });

  ob.enqueue(op({ type: "addTodo", todoId: "t1", payload: { text: "a", checked: false, order: 1 } }));
  ob.enqueue(op({ type: "setText", todoId: "t1", payload: { text: "ab" } }));
  ob.enqueue(op({ type: "deleteTodo", todoId: "t1" }));

  expect(ob.getSnapshot()).toEqual([]);
});

it("keeps the delete (and drops edits) when there was no pending add", () => {
  const ob = createOutbox({ storage: fakeStorage(), postOps: vi.fn(), isOnline: () => false });

  ob.enqueue(op({ type: "setText", todoId: "t1", payload: { text: "ab" } }));
  ob.enqueue(op({ type: "deleteTodo", todoId: "t1" }));

  const ops = ob.getSnapshot();
  expect(ops).toHaveLength(1);
  expect(ops[0].type).toBe("deleteTodo");
});

it("cancelOp removes a not-yet-flushed op", () => {
  const ob = createOutbox({ storage: fakeStorage(), postOps: vi.fn(), isOnline: () => false });

  ob.enqueue(op({ opId: "d1", type: "deleteTodo", todoId: "t1" }));
  ob.cancelOp("d1");

  expect(ob.isEmpty()).toBe(true);
});

it("flushes, removes acked ops and calls onFlushed", async () => {
  const postOps = vi.fn().mockResolvedValue([applied("o1")]);
  const ob = createOutbox({ storage: fakeStorage(), postOps, isOnline: () => true });
  const onFlushed = vi.fn();
  ob.setOnFlushed(onFlushed);

  ob.enqueue(op({ opId: "o1", type: "setText", payload: { text: "a" } }));
  await ob.flush();

  expect(postOps).toHaveBeenCalledTimes(1);
  expect(ob.isEmpty()).toBe(true);
  expect(onFlushed).toHaveBeenCalled();
});

it("reports rejected ops and drops them", async () => {
  const postOps = vi
    .fn()
    .mockResolvedValue([{ opId: "o1", status: "rejected", error: "bad" }]);
  const ob = createOutbox({ storage: fakeStorage(), postOps, isOnline: () => true });
  const onOpsRejected = vi.fn();
  ob.setOnOpsRejected(onOpsRejected);

  ob.enqueue(op({ opId: "o1", type: "setChecked", payload: { checked: true } }));
  await ob.flush();

  expect(onOpsRejected).toHaveBeenCalledWith([
    { opId: "o1", status: "rejected", error: "bad" },
  ]);
  expect(ob.isEmpty()).toBe(true);
});

it("keeps acked ops in the overlay until onFlushed resolves, then drops them", async () => {
  // Prevents the add-flicker: the op must stay applied until the confirming
  // refetch lands, so the todo never vanishes in the ack->refetch gap.
  let resolveRefetch!: () => void;
  const refetch = new Promise<void>((res) => {
    resolveRefetch = res;
  });
  const postOps = vi.fn().mockResolvedValue([applied("o1")]);
  const ob = createOutbox({ storage: fakeStorage(), postOps, isOnline: () => true });
  ob.setOnFlushed(() => refetch);

  ob.enqueue(op({ opId: "o1", type: "setText", payload: { text: "a" } }));
  const flushPromise = ob.flush();

  await new Promise((r) => setTimeout(r, 0)); // let flush park on the onFlushed await
  expect(ob.isEmpty()).toBe(false); // op still applied while refetch is in flight

  resolveRefetch();
  await flushPromise;
  expect(ob.isEmpty()).toBe(true); // dropped only after refetch confirmed
});

it("reloads persisted ops on startup", () => {
  const storage = fakeStorage();
  const first = createOutbox({ storage, postOps: vi.fn(), isOnline: () => false });
  first.enqueue(op({ opId: "o1", type: "setText", payload: { text: "a" } }));

  // A fresh outbox over the same storage (simulates a page reload).
  const second = createOutbox({ storage, postOps: vi.fn(), isOnline: () => false });
  expect(second.getSnapshot().map((o) => o.opId)).toEqual(["o1"]);
});

it("retains ops and retries after backoff on a network error", async () => {
  vi.useFakeTimers();
  try {
    const postOps = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([applied("o1")]);
    const ob = createOutbox({ storage: fakeStorage(), postOps, isOnline: () => true });

    ob.enqueue(op({ opId: "o1", type: "setText", payload: { text: "a" } }));

    // enqueue schedules an immediate flush; run it — it fails.
    await vi.advanceTimersByTimeAsync(0);
    expect(postOps).toHaveBeenCalledTimes(1);
    expect(ob.isEmpty()).toBe(false);

    // First backoff is 2s; advancing triggers the retry, which succeeds.
    await vi.advanceTimersByTimeAsync(2000);
    expect(postOps).toHaveBeenCalledTimes(2);
    expect(ob.isEmpty()).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});
