import { apiClient } from "./client";
import { Todo, TodoNote } from "../common/types/Models";

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

export const createTodo = async (
  listName: string,
  todo: { text: string; todoId: string; checked: boolean; order: number },
): Promise<Todo> => {
  const { data } = await apiClient.post(
    `/api/todolists/${encodeURIComponent(listName)}/todos`,
    todo,
  );
  return data;
};

export const updateTodo = async (todo: {
  todoId: string;
  text: string;
  checked: boolean;
  order: number;
}): Promise<Todo> => {
  const { data } = await apiClient.put(`/api/todos/${todo.todoId}`, {
    text: todo.text,
    checked: todo.checked,
    order: todo.order,
  });
  return data;
};

export const deleteTodo = async (todoId: string): Promise<void> => {
  await apiClient.delete(`/api/todos/${todoId}`);
};

export const deleteTodos = async (todoIds: string[]): Promise<void> => {
  await apiClient.delete("/api/todos", { data: { todoIds } });
};

export const fetchTodoNote = async (
  todoId: string,
): Promise<TodoNote | null> => {
  const { data } = await apiClient.get(`/api/todos/${todoId}/note`);
  return data;
};

export const upsertTodoNote = async (
  todoId: string,
  text: string,
): Promise<{ text: string }> => {
  const { data } = await apiClient.put(`/api/todos/${todoId}/note`, { text });
  return data;
};