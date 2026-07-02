import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock neo4j-driver so tests run without a database (and never touch real data).
// Each test enqueues fake query results with mockRun.mockResolvedValueOnce(...).
const { mockRun } = vi.hoisted(() => ({ mockRun: vi.fn() }));

vi.mock("neo4j-driver", () => ({
  default: {
    driver: () => ({
      session: () => ({ run: mockRun, close: vi.fn() }),
    }),
    auth: { basic: () => ({}) },
  },
}));

const { app } = await import("./index.js");

const record = (obj) => ({ get: (key) => obj[key] });
const emptyResult = { records: [] };

beforeEach(() => {
  mockRun.mockReset();
});

describe("GET /api/labels", () => {
  it("returns labels with item counts", async () => {
    mockRun.mockResolvedValueOnce({
      records: [record({ labelId: "l1", name: "Packing", itemCount: 2 })],
    });

    const res = await request(app).get("/api/labels");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ labelId: "l1", name: "Packing", itemCount: 2 }]);
  });
});

describe("PUT /api/todos/:todoId", () => {
  it("falls back to updating a LabelTodo when no Todo matches", async () => {
    mockRun
      .mockResolvedValueOnce(emptyResult) // Todo query: no match
      .mockResolvedValueOnce({ records: [record({ todoId: "lt1" })] }); // LabelTodo query: match

    const res = await request(app)
      .put("/api/todos/lt1")
      .send({ text: "Tent", checked: true, order: 3 });

    expect(res.status).toBe(200);
    expect(mockRun).toHaveBeenCalledTimes(2);
    expect(mockRun.mock.calls[1][0]).toContain("LabelTodo");
  });

  // BUG: when neither a Todo nor a LabelTodo matches the id (e.g. the todo was
  // deleted by a label cascade in another dialog), the endpoint still responds
  // 200 with the echoed body. The client thinks the update succeeded.
  it("responds 404 when the id matches neither a Todo nor a LabelTodo", async () => {
    mockRun
      .mockResolvedValueOnce(emptyResult) // Todo query: no match
      .mockResolvedValueOnce(emptyResult); // LabelTodo query: no match either

    const res = await request(app)
      .put("/api/todos/ghost-id")
      .send({ text: "Ghost", checked: true, order: 1 });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/labels", () => {
  it("creates a label", async () => {
    mockRun
      .mockResolvedValueOnce(emptyResult) // duplicate-name check
      .mockResolvedValueOnce({ records: [record({})] }); // CREATE

    const res = await request(app).post("/api/labels").send({ name: "Packing" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Packing");
    expect(res.body.itemCount).toBe(0);
  });

  // BUG: no input validation. A missing/empty name reaches Cypher as null
  // (toLower(null) errors against a real database -> 500) or creates a
  // nameless label. The API should reject it with 400.
  it("responds 400 when name is missing", async () => {
    mockRun.mockResolvedValue(emptyResult);

    const res = await request(app).post("/api/labels").send({});

    expect(res.status).toBe(400);
  });

  it("responds 400 when name is blank", async () => {
    mockRun.mockResolvedValue(emptyResult);

    const res = await request(app).post("/api/labels").send({ name: "   " });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/labels/:labelId/items", () => {
  // BUG: same missing validation for label items - empty text is accepted
  // and stored, producing blank todos when the label is imported.
  it("responds 400 when text is missing", async () => {
    mockRun.mockResolvedValue(emptyResult);

    const res = await request(app).post("/api/labels/l1/items").send({});

    expect(res.status).toBe(400);
  });
});
