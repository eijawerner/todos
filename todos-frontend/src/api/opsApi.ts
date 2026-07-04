import { apiClient } from "./client";
import { Op, OpResult } from "../sync/opTypes";

// Drains a batch of outbox ops to the backend. Results come back in request
// order (see todos-backend POST /api/ops). Rejects on network/500 so the
// outbox retries the whole batch (safe: ops are deduped by opId server-side).
export const postOps = async (ops: Op[]): Promise<OpResult[]> => {
  const { data } = await apiClient.post("/api/ops", { ops });
  return data.results;
};
