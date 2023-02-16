export type StyledProps = {
  /* For styled-components. This prop is optional, since TypeScript won't know that it's passed by the wrapper */
  className?: string;
};

// Todo -[BELONGS_TO]-> TodoList
export interface Todo {
  text: string; // TODO: rename to task
  checked: boolean;
  id: string;
  // <id>: ... HOWTO access id?
  // next: Todo
  // prev: Todo
}

export interface TodoList {
  name: string;
  todos: [Todo];
  todosOrder: [string];
}

export interface TodoListsData {
  todoLists: TodoList[];
}
