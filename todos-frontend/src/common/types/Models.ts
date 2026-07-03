export type StyledProps = {
  /* For styled-components. This prop is optional, since TypeScript won't know that it's passed by the wrapper */
  className?: string;
};

// RegularTodo -[BELONGS_TO]-> TodoList
export interface RegularTodo {
  text: string;
  checked: boolean;
  todoId: string;
  order: number;
  note?: TodoNote;
}

// LabelTodo -[BELONGS_TO]-> TodoList, -[SOURCED_FROM]-> LabelItem
export interface LabelTodo {
  text: string;
  checked: boolean;
  todoId: string;
  order: number;
  note?: TodoNote;
  labelItemId: string;
}

export type Todo = RegularTodo | LabelTodo;

export const isLabelTodo = (item: Todo): item is LabelTodo =>
  'labelItemId' in item;

export interface Label {
  labelId: string;
  name: string;
  itemCount: number;
}

export interface LabelItem {
  itemId: string;
  text: string;
}

export interface TodoNote {
  text: string;
  links: string[];
}

export interface TodoList {
  name: string;
  todos: Todo[];
}

export interface TodoListResponse {
  name: string;
}

export interface TodoListsData {
  todoLists: TodoList[];
}

export type ChangeRequest = {
  type: "add" | "delete" | "update";
  todo: RegularTodo;
  id: string;
};
