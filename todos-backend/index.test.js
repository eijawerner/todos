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

describe("POST /api/todolists/:name/todos", () => {
  it("creates a LabelTodo linked to the label item when labelItemId is given", async () => {
    mockRun.mockResolvedValueOnce({ records: [record({ text: "Tent" })] });

    const res = await request(app)
      .post("/api/todolists/Trip/todos")
      .send({ todoId: "lt1", checked: true, order: 2, labelItemId: "li1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todoId: "lt1",
      text: "Tent",
      checked: true,
      order: 2,
      labelItemId: "li1",
    });
    expect(mockRun.mock.calls[0][0]).toContain("LabelTodo");
    expect(mockRun.mock.calls[0][0]).toContain("SOURCED_FROM");
  });

  it("responds 404 when the source label item no longer exists", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app)
      .post("/api/todolists/Trip/todos")
      .send({ todoId: "lt1", checked: false, order: 2, labelItemId: "gone" });

    expect(res.status).toBe(404);
  });

  it("creates a regular Todo when no labelItemId is given", async () => {
    mockRun.mockResolvedValueOnce({ records: [record({})] });

    const res = await request(app)
      .post("/api/todolists/Trip/todos")
      .send({ todoId: "t1", text: "Milk", checked: false, order: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todoId: "t1", text: "Milk", checked: false, order: 1 });
    expect(mockRun.mock.calls[0][0]).not.toContain("LabelTodo");
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

describe("DELETE /api/todos/:todoId", () => {
  it("deletes a todo", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app).delete("/api/todos/t1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});

describe("DELETE /api/todos (bulk)", () => {
  it("deletes all given todoIds", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app)
      .delete("/api/todos")
      .send({ todoIds: ["a", "b"] });

    expect(res.status).toBe(200);
    expect(mockRun.mock.calls[0][1]).toEqual({ todoIds: ["a", "b"] });
  });
});

describe("GET /api/todos/:todoId/note", () => {
  it("returns the note text", async () => {
    mockRun.mockResolvedValueOnce({ records: [record({ text: "2% fat" })] });

    const res = await request(app).get("/api/todos/t1/note");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "2% fat" });
  });

  it("returns null when the todo has no note", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app).get("/api/todos/t1/note");

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});

describe("PUT /api/todos/:todoId/note", () => {
  it("upserts and echoes the note text", async () => {
    mockRun.mockResolvedValueOnce(emptyResult);

    const res = await request(app)
      .put("/api/todos/t1/note")
      .send({ text: "hello" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "hello" });
    expect(mockRun.mock.calls[0][1]).toEqual({ todoId: "t1", text: "hello" });
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
