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

describe("POST /api/todos/:todoId/add-to-label", () => {
  it("relabels the todo and links it to a label item", async () => {
    mockRun.mockResolvedValueOnce({
      records: [
        record({ todoId: "t1", text: "Tent", labelItemId: "li1", checked: false, order: 3 }),
      ],
    });

    const res = await request(app)
      .post("/api/todos/t1/add-to-label")
      .send({ labelId: "l1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todoId: "t1",
      text: "Tent",
      checked: false,
      order: 3,
      labelItemId: "li1",
    });
    const cypher = mockRun.mock.calls[0][0];
    expect(cypher).toContain("SET t:LabelTodo");
    expect(cypher).toContain("SOURCED_FROM");
    expect(cypher).toContain("MERGE (li:LabelItem");
  });

  it("responds 400 when labelId is missing", async () => {
    const res = await request(app).post("/api/todos/t1/add-to-label").send({});

    expect(res.status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("responds 404 when the todo is missing or already a label-todo", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app)
      .post("/api/todos/ghost/add-to-label")
      .send({ labelId: "l1" });

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

describe("GET /api/todolists", () => {
  it("returns the todo lists", async () => {
    mockRun.mockResolvedValueOnce({
      records: [record({ name: "Trip" }), record({ name: "Home" })],
    });

    const res = await request(app).get("/api/todolists");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ name: "Trip" }, { name: "Home" }]);
  });

  it("responds 500 when the database query fails", async () => {
    mockRun.mockRejectedValueOnce(new Error("db down"));

    const res = await request(app).get("/api/todolists");

    expect(res.status).toBe(500);
  });
});

describe("POST /api/todolists", () => {
  it("creates a list", async () => {
    mockRun
      .mockResolvedValueOnce(emptyResult) // duplicate-name check
      .mockResolvedValueOnce({ records: [record({ name: "Trip" })] });

    const res = await request(app).post("/api/todolists").send({ name: "Trip" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "Trip" });
  });

  it("responds 409 when a list with the same name exists", async () => {
    mockRun.mockResolvedValueOnce({ records: [record({ name: "trip" })] });

    const res = await request(app).post("/api/todolists").send({ name: "Trip" });

    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/todolists/:name", () => {
  it("deletes the list", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app).delete("/api/todolists/Trip");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockRun.mock.calls[0][1]).toEqual({ name: "Trip" });
  });
});

describe("GET /api/todolists/:name/todos", () => {
  it("maps regular todos, label-todos, notes and neo4j integers", async () => {
    mockRun.mockResolvedValueOnce({
      records: [
        record({
          todoId: "t1",
          text: "Milk",
          checked: false,
          order: { toNumber: () => 1 }, // neo4j Integer
          noteText: "2% fat",
          labelItemId: null,
        }),
        record({
          todoId: "lt1",
          text: "Tent",
          checked: true,
          order: 2,
          noteText: null,
          labelItemId: "li1",
        }),
      ],
    });

    const res = await request(app).get("/api/todolists/Trip/todos");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { todoId: "t1", text: "Milk", checked: false, order: 1, note: { text: "2% fat" } },
      { todoId: "lt1", text: "Tent", checked: true, order: 2, labelItemId: "li1" },
    ]);
  });
});

describe("DELETE /api/labels/:labelId", () => {
  it("deletes the label, its items and their sourced label-todos", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app).delete("/api/labels/l1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockRun.mock.calls[0][0]).toContain("LabelTodo");
  });
});

describe("GET /api/labels/:labelId/items", () => {
  it("returns the items of a label", async () => {
    mockRun.mockResolvedValueOnce({
      records: [record({ itemId: "i1", text: "Socks" })],
    });

    const res = await request(app).get("/api/labels/l1/items");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ itemId: "i1", text: "Socks" }]);
  });
});

describe("PUT /api/labels/:labelId/items/:itemId", () => {
  it("updates the item text", async () => {
    mockRun.mockResolvedValueOnce({ records: [record({})] });

    const res = await request(app)
      .put("/api/labels/l1/items/i1")
      .send({ text: "Wool socks" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itemId: "i1", text: "Wool socks" });
  });

  it("responds 400 when text is blank", async () => {
    mockRun.mockResolvedValue(emptyResult);

    const res = await request(app).put("/api/labels/l1/items/i1").send({ text: " " });

    expect(res.status).toBe(400);
  });

  it("responds 404 when the item does not exist", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app)
      .put("/api/labels/l1/items/ghost")
      .send({ text: "Wool socks" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/labels/:labelId/items/:itemId", () => {
  it("deletes the item and its sourced label-todos", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app).delete("/api/labels/l1/items/i1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockRun.mock.calls[0][0]).toContain("LabelTodo");
  });
});

describe("POST /api/todolists/:name/import-label", () => {
  it("appends imported items after the current max order", async () => {
    mockRun
      .mockResolvedValueOnce({
        records: [record({ maxOrder: { toNumber: () => 5 } })],
      })
      .mockResolvedValueOnce({
        records: [
          record({ todoId: "x1", text: "Tent", order: 6, labelItemId: "li1" }),
        ],
      });

    const res = await request(app)
      .post("/api/todolists/Trip/import-label")
      .send({ labelId: "l1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { todoId: "x1", text: "Tent", order: 6, checked: false, labelItemId: "li1" },
    ]);
    expect(mockRun.mock.calls[1][1].nextOrder).toBe(6);
  });

  it("starts at order 1 in an empty list", async () => {
    mockRun
      .mockResolvedValueOnce({ records: [record({ maxOrder: null })] })
      .mockResolvedValueOnce(emptyResult);

    const res = await request(app)
      .post("/api/todolists/Trip/import-label")
      .send({ labelId: "l1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockRun.mock.calls[1][1].nextOrder).toBe(1);
  });
});

describe("POST /api/ops", () => {
  // Every applyOp() runs the OpLog dedup MERGE first, then the op's own query.
  // fresh() enqueues an OpLog result marking the opId as new (so the op runs).
  const fresh = () => ({ records: [record({ fresh: true })] });
  const matched = () => ({ records: [record({ todoId: "t1" })] });

  it("applies a regular addTodo (Todo, not LabelTodo)", async () => {
    mockRun.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(matched());

    const res = await request(app)
      .post("/api/ops")
      .send({
        ops: [
          {
            opId: "o1",
            type: "addTodo",
            todoId: "t1",
            listName: "Trip",
            payload: { text: "Milk", checked: false, order: 1 },
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ opId: "o1", status: "applied" }]);
    expect(mockRun.mock.calls[0][0]).toContain("OpLog");
    expect(mockRun.mock.calls[1][0]).toContain("Todo");
    expect(mockRun.mock.calls[1][0]).not.toContain("LabelTodo");
  });

  it("applies a label-variant addTodo linked via SOURCED_FROM", async () => {
    mockRun.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(matched());

    const res = await request(app)
      .post("/api/ops")
      .send({
        ops: [
          {
            opId: "o1",
            type: "addTodo",
            todoId: "lt1",
            listName: "Trip",
            labelItemId: "li1",
            payload: { text: "Tent", checked: false, order: 2 },
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ opId: "o1", status: "applied" }]);
    expect(mockRun.mock.calls[1][0]).toContain("SOURCED_FROM");
  });

  it("applies setText against a Todo only", async () => {
    mockRun.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(matched());

    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "setText", todoId: "t1", payload: { text: "Eggs" } }] });

    expect(res.body.results).toEqual([{ opId: "o1", status: "applied" }]);
    expect(mockRun.mock.calls[1][0]).toContain("(item:Todo");
    expect(mockRun.mock.calls[1][0]).not.toContain("LabelTodo");
  });

  it("applies setChecked", async () => {
    mockRun.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(matched());

    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "setChecked", todoId: "t1", payload: { checked: true } }] });

    expect(res.body.results).toEqual([{ opId: "o1", status: "applied" }]);
    expect(mockRun.mock.calls[1][1].checked).toBe(true);
  });

  it("applies move", async () => {
    mockRun.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(matched());

    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "move", todoId: "t1", payload: { order: 2.5 } }] });

    expect(res.body.results).toEqual([{ opId: "o1", status: "applied" }]);
    expect(mockRun.mock.calls[1][1].order).toBe(2.5);
  });

  it("applies deleteTodo", async () => {
    mockRun
      .mockResolvedValueOnce(fresh())
      .mockResolvedValueOnce({ records: [record({ deletedId: "t1" })] });

    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "deleteTodo", todoId: "t1", payload: {} }] });

    expect(res.body.results).toEqual([{ opId: "o1", status: "applied" }]);
    expect(mockRun.mock.calls[1][0]).toContain("DETACH DELETE");
  });

  it("applies setNote", async () => {
    mockRun.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(matched());

    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "setNote", todoId: "t1", payload: { text: "buy 2%" } }] });

    expect(res.body.results).toEqual([{ opId: "o1", status: "applied" }]);
    expect(mockRun.mock.calls[1][0]).toContain("HAS_NOTES");
  });

  it("reports noop when the target todo is missing", async () => {
    mockRun.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(emptyResult);

    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "setChecked", todoId: "gone", payload: { checked: true } }] });

    expect(res.body.results).toEqual([{ opId: "o1", status: "noop" }]);
  });

  it("reports duplicate and skips the write when the opId was already applied", async () => {
    mockRun.mockResolvedValueOnce({ records: [record({ fresh: false })] });

    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "setText", todoId: "t1", payload: { text: "x" } }] });

    expect(res.body.results).toEqual([{ opId: "o1", status: "duplicate" }]);
    expect(mockRun).toHaveBeenCalledTimes(1); // only the OpLog MERGE, no op write
  });

  it("rejects an invalid op without touching the database", async () => {
    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "setChecked", todoId: "t1", payload: {} }] });

    expect(res.status).toBe(200);
    expect(res.body.results[0].opId).toBe("o1");
    expect(res.body.results[0].status).toBe("rejected");
    expect(res.body.results[0].error).toEqual(expect.any(String));
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("returns results in request order for a mixed batch", async () => {
    mockRun
      .mockResolvedValueOnce(fresh()) // op1 OpLog
      .mockResolvedValueOnce(matched()) // op1 setText
      .mockResolvedValueOnce(fresh()) // op3 OpLog (op2 is rejected, no DB)
      .mockResolvedValueOnce(matched()); // op3 setChecked

    const res = await request(app)
      .post("/api/ops")
      .send({
        ops: [
          { opId: "o1", type: "setText", todoId: "t1", payload: { text: "a" } },
          { opId: "o2", type: "setChecked", todoId: "t2", payload: {} }, // invalid
          { opId: "o3", type: "setChecked", todoId: "t3", payload: { checked: true } },
        ],
      });

    expect(res.body.results).toEqual([
      { opId: "o1", status: "applied" },
      { opId: "o2", status: "rejected", error: expect.any(String) },
      { opId: "o3", status: "applied" },
    ]);
  });

  it("responds 400 when ops is not an array", async () => {
    const res = await request(app).post("/api/ops").send({ ops: "nope" });

    expect(res.status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("responds 400 on an empty batch", async () => {
    const res = await request(app).post("/api/ops").send({ ops: [] });

    expect(res.status).toBe(400);
  });

  it("responds 500 when a DB error occurs mid-batch so the client retries", async () => {
    mockRun.mockResolvedValueOnce(fresh()).mockRejectedValueOnce(new Error("db down"));

    const res = await request(app)
      .post("/api/ops")
      .send({ ops: [{ opId: "o1", type: "setText", todoId: "t1", payload: { text: "a" } }] });

    expect(res.status).toBe(500);
  });
});
