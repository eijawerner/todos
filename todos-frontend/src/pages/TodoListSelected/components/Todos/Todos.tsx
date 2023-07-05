import styled from "styled-components";
import {
  ChangeRequest,
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

  // Queries
  const loadTodoData = useQuery<TodoListsData>(
    queries.GET_TODOS_IN_TODOLIST_WITH_NAME,
    { variables: { listName: listName } }
  );

  // Mutations
  const [addTodo, addTodoData] = useMutation(queries.CREATE_TODO);
  const [updateTodoListOrder, updateTodoListOrderData] = useMutation(queries.UPDATE_TODOLIST_ORDER);
  const [editTodo, editTodoData] = useMutation(queries.UPDATE_TODO);

  // State
  const [todos, setTodos] = useState<Todo[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

   // Online state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update network status
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine === true) {
        if (changes.length > 0) {
          // load change requests
          console.log('save changes!');
        } else {
          reloadTodosList();
        }
      }
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [isOnline]);

  const client = useApolloClient();

  const refToLast = React.createRef<HTMLInputElement>();

  const getSortedTodos = (todoList: Todo[]) => {
    const todosOrdered = [...todoList].sort((t1, t2) => {
      if (t1.order > t2.order) {
        return 1;
      } else if (t1.order < t2.order ) {
        return -1;
      }
      return 0;
    });
    return todosOrdered;
  }

  const sortAndSetTodos = (todoList: Todo[]) => {
    setTodos(getSortedTodos(todoList));
  }

  useEffect(() => {
    const todoList: Todo[] =
      loadTodoData.data && loadTodoData.data.todoLists.length > 0
        ? loadTodoData.data?.todoLists[0].todos
        : [];
    // Don't overwrite if there are changes locally that needs to be saved first
    if (changes.length === 0) {
      sortAndSetTodos(todoList);
    }
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
  
  const handleCheckTodo = (todo: Todo, checked: boolean) => {
    let order;
    const todosWihoutCheckedTodo = todos.filter(t => t.todoId !== todo.todoId)
    const idxFirstUncheckedItem = todosWihoutCheckedTodo.findIndex(t => !t.checked);
    const idxLastCheckedItem = idxFirstUncheckedItem > 0 ? idxFirstUncheckedItem - 1 : -1;

    if (todosWihoutCheckedTodo.length === 0) {
      // only 1 element in the list
      order = 1;
    } else if (checked) {
      // Move todo last of checked items

      if (idxFirstUncheckedItem === -1) {
        // no unchecked items, keep it where it is
        order = todo.order;
      } else if (idxFirstUncheckedItem >= 1) {
          const orderBefore = todosWihoutCheckedTodo[idxLastCheckedItem].order;
          const orderAfter = todosWihoutCheckedTodo[idxFirstUncheckedItem].order;
          order = todo.order > orderBefore && todo.order < orderAfter ? todo.order : orderBefore + (orderAfter - orderBefore) / 2;
      } else {
        const orderAfter = todosWihoutCheckedTodo[idxFirstUncheckedItem].order;
        order = todo.order < orderAfter ? todo.order : orderAfter / 2;
      }
      
    } else {
      // Move todo first of unchecked items

      if (idxFirstUncheckedItem === -1) {
         // no unchecked items, put it last in the list (if not already there)
        const orderBefore = todosWihoutCheckedTodo[todosWihoutCheckedTodo.length - 1].order;
        order = todo.order > orderBefore ? todo.order : Math.ceil(orderBefore + 1);
      } else if (idxFirstUncheckedItem >= 1) {
        const orderBefore = todosWihoutCheckedTodo[idxLastCheckedItem].order;
        const orderAfter = todosWihoutCheckedTodo[idxFirstUncheckedItem].order;
        order =  todo.order > orderBefore && todo.order < orderAfter ? todo.order : orderBefore + (orderAfter - orderBefore) / 2;
      } else {
        const orderAfter =  todosWihoutCheckedTodo[idxFirstUncheckedItem].order 
        order = todo.order < orderAfter ? todo.order : orderAfter / 2;
      }
      
    }
    const updatedTodo = { todoId: todo.todoId, text: todo.text, checked: checked, order: order };
    sortAndSetTodos([...todosWihoutCheckedTodo, updatedTodo]);
    handleEditTodo(updatedTodo);
  }

  const handleEditTodo = (todo: Todo) => {    
    setChanges([{ type: 'update', todo: todo}])

    editTodo({ variables: {...todo}})
      .then(() => {
        setChanges([]);
        reloadTodosList();
      })
      .catch((error) => {
        setErrorBanner('failed to edit task')
        setTimeout(() => setErrorBanner(null), 3000);
        console.log(error);
        setChanges([]);
        reloadTodosList();
      });

  }

  // Sync with latest todo list every minute
  // useInterval(reloadTodosList, 60 * 1000);

  const handleAddTask = (listName: string) => {
    const uuid = crypto.randomUUID();
    // reload first to get latest list?
    const order = todos.length > 0 ? todos[todos.length - 1].order + 1.0 : 1.0;
    const newTodoItem: Todo = {
      text: "",
      todoId: uuid,
      checked: false,
      order: order
    }
    // Add locally first then update data as well
    // todo add id or timestamp to change request as well, to know which one to remove when succeds
    setChanges([...changes, {type: 'add', todo: newTodoItem }]);
    setTodos([...todos, newTodoItem]);

    addTodo({
      variables: { 
        listName: listName, 
        task: newTodoItem.text, 
        todoId: newTodoItem.todoId,
        checked: newTodoItem.checked, 
        order: newTodoItem.order},
    })
      .then((result) => {
        setChanges([]);
        reloadTodosList(); // TODO: reload to display list perhaps set locally before loading to show quicker?
      })
      // Alert user and decide if want to retry or skip change?
      .catch((error) => {
        setChanges([]);
        setTodos(todos.filter(todo => todo.todoId !== newTodoItem.todoId))
        setErrorBanner('failed to add task')
        setTimeout(() => setErrorBanner(null), 3000);
        console.log('failed to add task', error)
      });
  };

  const handleDeleteTodo = (id: string) => {
    // remove locally first
    setTodos(todos.filter(todo => todo.todoId !== id));
    setChanges([{ type: 'delete', todo: {todoId: id, text: '', order: 0, checked: false }}]);

    if (client) {
      client
        .mutate({
          mutation: queries.DELETE_TODO,
          variables: { todoId: id },
        })
        .then((result) => {
          console.log(`deleted todo with id=${id}`);
          // Todo remove ONLY the added one
          setChanges([]);
          reloadTodosList();
        })
        .catch((error) => {
          console.log(error)
          setChanges([]);
        });
      }
  };

  return (
    <>
      {loadTodoData.loading && <p>loading...</p>}
      {loadTodoData.error && <p>{`Error: ${loadTodoData.error.message}`}</p>}
      {errorBanner && <p>{errorBanner}</p>}
      {<StyledTodoList>
          {todos.map((todo, idx) => (
            <TodoRow
              key={todo.todoId}
              todo={todo}
              deleteTodo={handleDeleteTodo}
              checkTodo={handleCheckTodo}
              saveTodo={handleEditTodo}
              addNewItem={() => handleAddTask(listName)}
              inputRef={idx === todos.length - 1 ? refToLast: undefined}
            />
          ))}
        </StyledTodoList>
        }
        <div style={{ display: 'flex', gap: '8px'}}>
            <Button
            appearance="primary"
            onClick={() => handleAddTask(listName)}
            text={"New task"}
          />
          <Button
            appearance="secondary"
            onClick={() => reloadTodosList()}
            text={"sync"}
          />
        </div>
      
    </>
  );
}

export const Todos = styled(TodosBase)`
  ${style}
`;
