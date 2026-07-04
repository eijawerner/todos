import { apiClient } from "./client";
import { Todo, LabelTodo, Label, LabelItem } from "../common/types/Models";

export const fetchTodoLists = async (): Promise<{ name: string }[]> => {
  const { data } = await apiClient.get("/api/todolists");
  return data;
};

export const createTodoList = async (name: string): Promise<{ name: string }> => {
  const { data } = await apiClient.post("/api/todolists", { name });
  return data;
};

export const deleteTodoList = async (name: string): Promise<void> => {
  await apiClient.delete(`/api/todolists/${encodeURIComponent(name)}`);
};

export const fetchTodos = async (listName: string): Promise<Todo[]> => {
  const { data } = await apiClient.get(
    `/api/todolists/${encodeURIComponent(listName)}/todos`,
  );
  return data;
};

// Per-todo writes (create/update/delete/note) now go through the operation
// outbox -> POST /api/ops (see src/sync/). Only list- and label-level
// operations remain here as plain REST.

// --------------- Labels ---------------

export const fetchLabels = async (): Promise<Label[]> => {
  const { data } = await apiClient.get("/api/labels");
  return data;
};

export const createLabel = async (name: string): Promise<Label> => {
  const { data } = await apiClient.post("/api/labels", { name });
  return data;
};

export const deleteLabel = async (labelId: string): Promise<void> => {
  await apiClient.delete(`/api/labels/${labelId}`);
};

export const fetchLabelItems = async (labelId: string): Promise<LabelItem[]> => {
  const { data } = await apiClient.get(`/api/labels/${labelId}/items`);
  return data;
};

export const addLabelItem = async (
  labelId: string,
  text: string,
): Promise<LabelItem> => {
  const { data } = await apiClient.post(`/api/labels/${labelId}/items`, { text });
  return data;
};

export const editLabelItem = async (
  labelId: string,
  itemId: string,
  text: string,
): Promise<LabelItem> => {
  const { data } = await apiClient.put(`/api/labels/${labelId}/items/${itemId}`, { text });
  return data;
};

export const deleteLabelItem = async (
  labelId: string,
  itemId: string,
): Promise<void> => {
  await apiClient.delete(`/api/labels/${labelId}/items/${itemId}`);
};

export const importLabelToList = async (
  listName: string,
  labelId: string,
): Promise<LabelTodo[]> => {
  const { data } = await apiClient.post(
    `/api/todolists/${encodeURIComponent(listName)}/import-label`,
    { labelId },
  );
  return data;
};