export type StyledProps = {
  /* For styled-components. This prop is optional, since TypeScript won't know that it's passed by the wrapper */
  className?: string;
};

// Todo -[BELONGS_TO]-> TodoList
export interface Todo {
  text: string; // TODO: rename to task
  checked: boolean;
  todoId: string;
  order: number;
  note?: TodoNote;
}

export interface TodoNote {
  text: string;
  links: string[];
}

export interface TodoList {
  name: string;
  todos: [Todo];
}

export interface TodoListsData {
  todoLists: TodoList[];
}

export type LocalTodo = Todo & {
  saved: boolean;
};

export type ChangeRequest = {
  type: "add" | "delete" | "update";
  todo: Todo;
  id: string;
};
