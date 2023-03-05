import styled from "styled-components";
import {
  StyledProps,
  Todo,
  TodoListsData,
} from "../../../../common/types/Models";
import React, { useEffect, useState } from "react";
import { style } from "./Todos.style";
import { TodoRow } from "./components/TodoRow/TodoRow";
import { Button } from "../../../../common/components/Button/Button";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { queries } from "../../Queries";
import { useInterval } from "../../../../common/hooks/Time";
import { COLOR_BLUE_SKY } from "../../../../common/contants/colors";

export type TodosProps = StyledProps & {
  listName: string;
};

const StyledTodoList = styled.ul`
  width: 100%;
  max-width: 50rem;
  color: ${COLOR_BLUE_SKY};
  list-style-type: none;
  padding: 0.5rem 0 1rem 0;
  margin: 0;
`;

function TodosBase({ listName }: TodosProps) {
  const loadTodoData = useQuery<TodoListsData>(
    queries.GET_TODOS_IN_TODOLIST_WITH_NAME,
    { variables: { listName: listName } }
  );
  const [addTodo, addTodoData] = useMutation(queries.CREATE_TODO);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [updateTodoListOrder, updateTodoListOrderData] = useMutation(queries.UPDATE_TODOLIST_ORDER);
  const client = useApolloClient();

  const refToLast = React.createRef<HTMLInputElement>();

  useEffect(() => {
    const todoList: Todo[] =
      loadTodoData.data && loadTodoData.data.todoLists.length > 0
        ? loadTodoData.data?.todoLists[0].todos
        : [];
    const todosOrder: string[] =
      loadTodoData.data && loadTodoData.data.todoLists.length > 0
        ? loadTodoData.data?.todoLists[0].todosOrder
        : [];

    let todosOrderToDisplay: Todo[] = [];
    if (todoList.length > 0) {
      const todosOrdered = todosOrder.map((todoId) => todoList.filter(todo => todo.todoId === todoId)[0]);
      const checkedTodos = todosOrdered.filter(todo => todo.checked);
      const uncheckedTodos = todosOrdered.filter(todo => !todo.checked);
      todosOrderToDisplay = [...checkedTodos, ...uncheckedTodos];
    }
    setTodos(todosOrderToDisplay);
  }, [listName, loadTodoData.data]);

  useEffect(() => {
    if (refToLast.current) {
      refToLast.current.focus();
    }
  }, [todos?.length]);

  const reloadTodosList = () => {
    loadTodoData
      .refetch()
      .then((r) => console.log("reloaded todos"))
      .catch((error) => console.log(error));
  };

  const updateTodosOrderAndReload = (newOrder: string[]) => {
    updateTodoListOrder({ variables: { listName: listName, todosOrder: newOrder } })
    .then(() => {
      reloadTodosList();
    })
    .catch((error) => {
      console.log('failed to update order', error);
    });
  }

  useInterval(reloadTodosList, 60 * 1000);

  const handleAddTask = (listName: string) => {
    const uuid = crypto.randomUUID();
    const newTodoItem: Todo = {
      text: "",
      todoId: uuid,
      checked: false
    }
    // TODO: fetch current todosOrder first?
    const oldOrder = loadTodoData.data?.todoLists[0].todosOrder ?? [];
    const newOrder = [...oldOrder, newTodoItem.todoId]
    addTodo({
      variables: { listName: listName, task: newTodoItem.text, todoId: newTodoItem.todoId, checked: newTodoItem.checked, todosOrder: newOrder},
    })
      .then((result) => {
        reloadTodosList(); // TODO: reload to display list perhaps set locally before loading to show quicker?
      })
      .catch((error) => console.log('faled to add task', error));
  };

  const handleDeleteTodo = (id: string) => {
    // TODO: fetch current todosOrder first?
    const oldOrder = loadTodoData.data?.todoLists[0].todosOrder ?? [];
    const newOrder = oldOrder.filter((todoId: string) => todoId !== id);
    // Delete from todosOrder first
    updateTodoListOrder({ variables: { listName: listName, todosOrder: newOrder } })
    .then(() => {
      console.log('updated order');
      if (client) {
        client
          .mutate({
            mutation: queries.DELETE_TODO,
            variables: { todoId: id },
          })
          .then((result) => {
            console.log(`deleted todo with id=${id}`);
            reloadTodosList();
          })
          .catch((error) => console.log(error));
      }
    })
    .catch((error) => {
      console.log('failed to update order', error);
    });
  };

  const moveTodoToFirstInList = (id: string) => {
    const oldOrder = loadTodoData.data?.todoLists[0].todosOrder ?? [];
    const orderWithoutId = oldOrder.filter((todoId: string) => todoId !== id);
    const newOrder = [id, ...orderWithoutId];
    updateTodosOrderAndReload(newOrder);
  };

  const moveTodoToLastInList = (id: string) => {
    const oldOrder = loadTodoData.data?.todoLists[0].todosOrder ?? [];
    const orderWithoutId = oldOrder.filter((todoId: string) => todoId !== id);
    const newOrder = [...orderWithoutId, id];
    updateTodosOrderAndReload(newOrder);
  }

  const handleEditedTodo = () => {
    if (todos) {
      reloadTodosList();
    }
  };

  if (loadTodoData.loading) return <p>Loading...</p>;
  if (loadTodoData.error)
    return <p>{`Error: ${loadTodoData.error.message}`}</p>;

    

  return (
    <>
      {<StyledTodoList>
          {todos.map((todo, idx) => (
            <TodoRow
              key={todo.todoId}
              todo={todo}
              deleteTodo={handleDeleteTodo}
              moveTodoToFirstInList={moveTodoToFirstInList}
              moveTodoToLastInList={moveTodoToLastInList}
              onEdited={handleEditedTodo}
              addNewItem={() => handleAddTask(listName)}
              inputRef={idx === todos.length - 1 ? refToLast: undefined}
            />
          ))}
        </StyledTodoList>
        }
      <Button
        appearance="primary"
        onClick={() => handleAddTask(listName)}
        text={"New task"}
      />
    </>
  );
}

export const Todos = styled(TodosBase)`
  ${style}
`;
