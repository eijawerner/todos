import styled from "styled-components";
import {
  ChangeRequest,
  StyledProps,
  Todo,
  TodoListsData,
} from "../../../../common/types/Models";
import React, { useCallback, useEffect, useState } from "react";
import { style } from "./Todos.style";
import { TodoRow } from "./components/TodoRow/TodoRow";
import { Button } from "../../../../common/components/Button/Button";
import { FetchResult, useApolloClient, useMutation, useQuery } from "@apollo/client";
import { queries } from "../../Queries";
import { useInterval } from "../../../../common/hooks/Time";
import { COLOR_BLUE_SKY } from "../../../../common/contants/colors";
import { Note } from "./components/Note/Note";

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

const executeSequentially = (promiseFactories: any) => {
  let result = Promise.resolve();
  promiseFactories.forEach((promiseFactory: any) => {
    result = result.then(promiseFactory);
  });
  return result;
}

function TodosBase({ listName }: TodosProps) {

  // Queries
  const loadTodoData = useQuery<TodoListsData>(
    queries.GET_TODOS_IN_TODOLIST_WITH_NAME,
    { variables: { listName: listName } }
  );

  // Mutations
  const [addTodo, addTodoData] = useMutation(queries.CREATE_TODO);
  const [editTodo, editTodoData] = useMutation(queries.UPDATE_TODO);

  // State
  const [todos, setTodos] = useState<Todo[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [noteIsVisible, setNoteIsVisible] = useState<string | null>(null);

   // Online state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update network status
    const handleStatusChange = () => {
      console.log('STATUS CHANGED', navigator.onLine);
      setIsOnline(navigator.onLine);
      if (navigator.onLine === true) {
        console.log('ONLINE AGAIN!');
        console.log('CURRENT changes', changes);
        if (changes.length > 0) {
          // load change requests
          console.log('save changes!', changes);
          let promises: (() => Promise<FetchResult<any, Record<string, any>, Record<string, any>>>)[] = [];
          changes.forEach(change => {
            if (change.type === 'update') {
              console.log('update todo change');
              const editPromise = () => editTodo({ variables: {...change.todo}});
              promises.push(editPromise);
            } else if (change.type === 'add') {
              console.log('add todo change', {...change.todo});
              const addPromise = () => addTodo({ variables: {
                listName, 
                task: change.todo.text,
                todoId: change.todo.todoId,
                checked: change.todo.checked,
                order: change.todo.order
                }});
              promises.push(addPromise);
            } else if (change.type === 'delete') {
              const deleteNoteInTodo = () => client
                  .mutate({
                mutation: queries.DELETE_TODO_NOTE_BELONGING_TO_TODO,
                variables: { todoId: change.todo.todoId }});
              promises.push(deleteNoteInTodo);
              const deletePromise = () => client
                .mutate({
                  mutation: queries.DELETE_TODO,
                  variables: { todoId: change.todo.todoId },
                })
              promises.push(deletePromise);
            }
            });

            executeSequentially(promises)
            .then(() => {
              console.log('successfully synced changes');
              console.log('set empty list changes');
              setChanges([]);
              reloadTodosList();
            })
            .catch(() => {
                console.log('failed to sync all changes');
                console.log('set empty list changes');
                setChanges([]);
              });
          
        } else {
          reloadTodosList();
        }
      }
    };

    console.log('add online/offline event listener');
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      console.log('remove online/offline event listener')
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [changes]);

  useEffect(() => {
    console.log('changes', changes);
  }, [changes])

  const client = useApolloClient();

  const refToLast = React.useRef<HTMLInputElement | null>(null);

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

  const setFocusToItem = (refToItem: React.RefObject<HTMLInputElement>) => {
    if (refToItem.current) {
      refToItem.current.focus();
    }
  };

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

  const reloadTodosList = () => {
    loadTodoData
      .refetch()
      .then((r) => console.log("reloaded todos"))
      .catch((error) => console.log(error));
  };
  
  const handleCheckTodo = (todo: Todo, checked: boolean) => {
    const otherTodos = todos.filter(t => t.todoId !== todo.todoId);

    // Put todo last of checked todos, works both if it just got checked or unchecked
    const checkedTodosAndCurrentChangedTodo = otherTodos.filter(t => t.checked).concat({
      ...todo,
      checked
    });
    const uncheckedTodos = otherTodos.filter(t => !t.checked);
    const newTodos = checkedTodosAndCurrentChangedTodo.concat(uncheckedTodos).map((todo, idx) => {
      return {
        ...todo,
        order: idx
      }
    });

    const oldTodos = [...todos];
    setTodos(newTodos);
    updateMultipleTodos(newTodos)
      .then(() => reloadTodosList())
      .catch(e => { 
        setTodos(oldTodos)
        console.error("Error updating todos:", e)
      });
  }

  const handleEditTodo = (todo: Todo) => {   
    const editChange: ChangeRequest = { type: 'update', todo: todo, id: crypto.randomUUID()}
    console.log('edit todo', todo.text);

    if (isOnline) {
      console.log('handleEditTodo is ONLINE');
      const newTodos = todos.map(t => {
        if (t.todoId === todo.todoId) {
          return todo
        } else {
          return t;
        }
      })
      setTodos(newTodos);
      editTodo({ variables: {...todo}})
      .then(() => {
        // success, do nothing
      })
      .catch((error) => {
        setErrorBanner('failed to edit task')
        setTimeout(() => setErrorBanner(null), 3000);
        console.log(error);
        reloadTodosList();
      });
    } else {
      console.log('add change', editChange);
      setChanges([...changes, editChange]);
    }
  }

  // Sync with latest todo list every minute
  // useInterval(reloadTodosList, 60 * 1000);

  const handleAddTask = useCallback((listName: string) => {
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
    const addChange: ChangeRequest =  {type: 'add', todo: newTodoItem, id: crypto.randomUUID() };
    
    setTodos([...todos, newTodoItem]);

    if (isOnline) {
      addTodo({
        variables: { 
          listName: listName, 
          task: newTodoItem.text, 
          todoId: newTodoItem.todoId,
          checked: newTodoItem.checked, 
          order: newTodoItem.order},
      })
      .then((result) => {
        // success, do nothing
        setFocusToItem(refToLast);
      })
      // Alert user and decide if want to retry or skip change?
      .catch((error) => {
        setTodos(todos.filter(todo => todo.todoId !== newTodoItem.todoId))
        setErrorBanner('failed to add task')
        setTimeout(() => setErrorBanner(null), 3000);
        reloadTodosList();
        console.log('failed to add task', error)
      });
    } else {
      // Save change for later when online again
      console.log('add change', addChange);
      setChanges([...changes, addChange]);
    }
  }, [todos, refToLast.current, isOnline]);

  const updateMultipleTodos = async (todos: Todo[]) => {
    const updateOrderPromises = todos.map((todo) => {
      return editTodo({ variables: {...todo} });
    })
    return await Promise.all(updateOrderPromises);
  }

  const handleDeleteTodo = (id: string) => {
    // remove locally first
    setTodos(todos.filter(todo => todo.todoId !== id));

    if (client && isOnline) {
      client
        .mutate({
          mutation: queries.DELETE_TODO_NOTE_BELONGING_TO_TODO,
          variables: { todoId: id }
        }).then(() => {
        client
            .mutate({
              mutation: queries.DELETE_TODO,
              variables: { todoId: id },
            })
            .then((result) => {
              console.log(`deleted todo with id=${id}`);
            })
            .catch((error) => {
              console.log(error);
              reloadTodosList();
              setErrorBanner('failed to delete task')
            });
      }).catch(e => console.log('failed to delete todo note belonging to todo to be deleted', e))
      } else {
        // Save for when online again
        console.log('add delete change');
        setChanges([{ type: 'delete', todo: {todoId: id, text: '', order: 0, checked: false },  id: crypto.randomUUID()}]);
      }
  };

  const handleAddNote = (todoId: string) => {
    const note = {
      text: 'test',
      links: [],
    }
    client
      .mutate({
        mutation: queries.CREATE_TODO_NOTE,
        variables: { todoId, noteText: note.text },
      })
      .then((result) => {
        console.log(`added note to todo with id=${todoId}`);
        reloadTodosList();
        setNoteIsVisible(todoId);
      })
      .catch((error) => {
        console.log(error);
        setErrorBanner('failed to add note')
        setTimeout(() => setErrorBanner(null), 3000);
      });
  }

  const viewNote = (todoId: string) => {
    // fetch note for todo id, check if exists otherwise create it
    setNoteIsVisible(todoId);
    client.query({
      query: queries.GET_TODO_NOTE,
      variables: { todoId: todoId },
    }).then((result) => {
      console.log('result', result);
      if (result.data.todos.length === 0) {
        console.error('no todo with that id found', todoId);
        return;
      }
      if (!result.data.todos[0].note) {
        console.error('no note found, creating...', todoId);
        handleAddNote(todoId);
        return;
      }
      console.log('note', result.data.todos[0].note.text);
    }).catch((error) => {
      console.log('error', error);
    });
  }

  const editNoteText = (noteText: string) => {
    console.log('edit note', noteText);
    const todoIdOfNodeToEdit = noteIsVisible;
    setNoteIsVisible(null);
    client.mutate({
      mutation: queries.UPDATE_TODO_NOTE,
      variables: { todoId: todoIdOfNodeToEdit, noteText: noteText },
    }).then((result) => {
      console.log('note updated', result);     
      reloadTodosList();
    }).catch((error) => {
      console.log('error', error);
      setErrorBanner('failed to edit note')
      setTimeout(() => setErrorBanner(null), 3000);
    });
  }

  return (
    <>
      {noteIsVisible && <Note note={todos.find(t => t.todoId === noteIsVisible)?.note} editNoteText={editNoteText} onClose={() => setNoteIsVisible(null)} />
      }
      {loadTodoData.loading && <p>loading...</p>}
      {loadTodoData.error && <p>{`Error: ${loadTodoData.error.message}`}</p>}
      {errorBanner && <p style={{fontSize: '1.5rem', color: 'red'}}>{errorBanner}</p>}
      {<StyledTodoList>
          {todos.map((todo, idx) => (
            <TodoRow
              key={todo.todoId}
              todo={todo}
              deleteTodo={handleDeleteTodo}
              checkTodo={handleCheckTodo}
              saveTodo={handleEditTodo}
              addNewItem={() => handleAddTask(listName)}
              viewNote={viewNote}
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
