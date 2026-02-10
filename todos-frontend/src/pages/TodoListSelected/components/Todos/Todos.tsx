import styled from "styled-components";
import {
  ChangeRequest,
  StyledProps,
  Todo,
  TodoNote,
} from "../../../../common/types/Models";
import React, { useCallback, useEffect, useState } from "react";
import { style } from "./Todos.style";
import { TodoRow } from "./components/TodoRow/TodoRow";
import { Button } from "../../../../common/components/Button/Button";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchTodos,
  createTodo,
  updateTodo,
  deleteTodo as deleteTodoApi,
  fetchTodoNote,
  upsertTodoNote,
} from "../../../../api/todoApi";
import { COLOR_GREY_LIGHT } from "../../../../common/contants/colors";
import { Note } from "./components/Note/Note";
import { SortableList } from "../SortableList/SortableList";

export type TodosProps = StyledProps & {
  listName: string;
};

const StyledTodoRowWrapper = styled.div`
  background: ${COLOR_GREY_LIGHT};
  border-radius: 0.5rem;
  width: 100%;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0;
  margin: 0 0.75rem;
`;

const executeSequentially = (promiseFactories: any) => {
  let result = Promise.resolve();
  promiseFactories.forEach((promiseFactory: any) => {
    result = result.then(promiseFactory);
  });
  return result;
};

function TodosBase({ listName }: TodosProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [noteIsVisible, setNoteIsVisible] = useState<{
    todoId: string;
    note: TodoNote;
  } | null>(null);

  // Online state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const errorTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const REGULAR_TIMEOUT_BANNER = 3000;
  const showErrorBanner = (message: string, timeout?: number) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setErrorBanner(message);
    if (timeout) {
      errorTimeoutRef.current = setTimeout(() => {
        setErrorBanner(null);
        errorTimeoutRef.current = null;
      }, timeout);
    }
  }

  const queryClient = useQueryClient();

  // Query
  const loadTodoData = useQuery({
    queryKey: ["todos", listName],
    queryFn: () => fetchTodos(listName),
  });

  // Mutations
  const updateTodoMutation = useMutation({
    mutationFn: updateTodo,
    onError: (error) => {
      showErrorBanner("failed to edit task", REGULAR_TIMEOUT_BANNER);
      console.log(error);
      reloadTodosList();
    },
  });

  const createTodoMutation = useMutation({
    mutationFn: (params: {
      listName: string;
      todo: { text: string; todoId: string; checked: boolean; order: number };
    }) => createTodo(params.listName, params.todo),
  });

  const deleteTodoMutation = useMutation({
    mutationFn: deleteTodoApi,
    onError: (error) => {
      console.log(error);
      reloadTodosList();
      showErrorBanner("failed to delete task", 5000);
    },
  });

  const upsertNoteMutation = useMutation({
    mutationFn: (params: { todoId: string; text: string }) =>
      upsertTodoNote(params.todoId, params.text),
  });

  useEffect(() => {
    // Update network status
    const handleStatusChange = () => {
      console.log("STATUS CHANGED", navigator.onLine);
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        console.log("ONLINE AGAIN!");
        console.log("CURRENT changes", changes);
        if (changes.length > 0) {
          console.log("save changes!", changes);
          let promises: (() => Promise<any>)[] = [];
          changes.forEach((change) => {
            if (change.type === "update") {
              console.log("update todo change");
              const editPromise = () =>
                updateTodoMutation.mutateAsync({ ...change.todo });
              promises.push(editPromise);
            } else if (change.type === "add") {
              console.log("add todo change", { ...change.todo });
              const addPromise = () =>
                createTodoMutation.mutateAsync({
                  listName,
                  todo: {
                    text: change.todo.text,
                    todoId: change.todo.todoId,
                    checked: change.todo.checked,
                    order: change.todo.order,
                  },
                });
              promises.push(addPromise);
            } else if (change.type === "delete") {
              const deletePromise = () =>
                deleteTodoMutation.mutateAsync(change.todo.todoId);
              promises.push(deletePromise);
            }
          });

          executeSequentially(promises)
            .then(() => {
              console.log("successfully synced changes");
              setChanges([]);
              reloadTodosList();
            })
            .catch(() => {
              console.log("failed to sync all changes");
              setChanges([]);
            });
        } else {
          reloadTodosList();
        }
      }
    };

    console.log("add online/offline event listener");
    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);

    return () => {
      console.log("remove online/offline event listener");
      window.removeEventListener("online", handleStatusChange);
      window.removeEventListener("offline", handleStatusChange);
    };
  }, [changes]);

  useEffect(() => {
    console.log("changes", changes);
  }, [changes]);

  const todoRefs = React.useRef<Map<string, HTMLInputElement>>(new Map());

  const getSortedTodos = (todoList: Todo[]) => {
    return [...todoList].sort((t1, t2) => {
      if (t1.order > t2.order) {
        return 1;
      } else if (t1.order < t2.order) {
        return -1;
      }
      return 0;
    });
  };

  const sortAndSetTodos = (todoList: Todo[]) => {
    setTodos(getSortedTodos(todoList));
  };

  const setFocusToTodo = (todoId: string) => {
    const ref = todoRefs.current.get(todoId);
    if (ref) {
      ref.focus();
    }
  };

  useEffect(() => {
    const todoList: Todo[] = loadTodoData.data ?? [];
    // Don't overwrite if there are changes locally that needs to be saved first
    if (changes.length === 0) {
      sortAndSetTodos(todoList);
    }
  }, [listName, loadTodoData.data]);

  const reloadTodosList = () => {
    queryClient.invalidateQueries({ queryKey: ["todos", listName] });
  };

  const handleCheckTodo = (todo: Todo, checked: boolean) => {
    const otherTodos = todos.filter((t) => t.todoId !== todo.todoId);

    // Put todo last of checked todos, works both if it just got checked or unchecked
    const checkedTodosAndCurrentChangedTodo = otherTodos
      .filter((t) => t.checked)
      .concat({
        ...todo,
        checked,
      });
    const uncheckedTodos = otherTodos.filter((t) => !t.checked);
    const newTodos = checkedTodosAndCurrentChangedTodo
      .concat(uncheckedTodos)
      .map((todo, idx) => {
        return {
          ...todo,
          order: idx,
        };
      });

    const oldTodos = [...todos];
    setTodos(newTodos);
    updateMultipleTodos(newTodos)
      .then(() => reloadTodosList())
      .catch((e) => {
        setTodos(oldTodos);
        console.error("Error updating todos:", e);
      });
  };

  const handleEditTodo = (todo: Todo) => {
    const editChange: ChangeRequest = {
      type: "update",
      todo: todo,
      id: crypto.randomUUID(),
    };
    console.log("edit todo", todo.text);

    if (isOnline) {
      console.log("handleEditTodo is ONLINE");
      const newTodos = todos.map((t) => {
        if (t.todoId === todo.todoId) {
          return todo;
        } else {
          return t;
        }
      });
      setTodos(newTodos);
      updateTodoMutation.mutate({ ...todo }); // success, do nothing (error handled by mutation)
    } else {
      console.log("add change", editChange);
      setChanges([...changes, editChange]);
    }
  };

  // Sync with latest todo list every minute
  // useInterval(reloadTodosList, 60 * 1000);

  const handleAddTask = useCallback(
    (listName: string) => {
      const uuid = crypto.randomUUID();
      // reload first to get latest list?
      const order =
        todos.length > 0 ? todos[todos.length - 1].order + 1.0 : 1.0;
      const newTodoItem: Todo = {
        text: "",
        todoId: uuid,
        checked: false,
        order: order,
      };
      const addChange: ChangeRequest = {
        type: "add",
        todo: newTodoItem,
        id: crypto.randomUUID(),
      };

      // Add locally first then update data as well
      // todo add id or timestamp to change request as well, to know which one to remove when succeeds
      setTodos([...todos, newTodoItem]);

      if (isOnline) {
        createTodoMutation.mutate(
          {
            listName,
            todo: {
              text: newTodoItem.text,
              todoId: newTodoItem.todoId,
              checked: newTodoItem.checked,
              order: newTodoItem.order,
            },
          },
          {
            onSuccess: () => {
              setFocusToTodo(newTodoItem.todoId);
            },
            // Alert user and decide if want to retry or skip change?
            onError: (error) => {
              setTodos(
                todos.filter((todo) => todo.todoId !== newTodoItem.todoId),
              );
              showErrorBanner("failed to add task", REGULAR_TIMEOUT_BANNER);
              reloadTodosList();
              console.log("failed to add task", error);
            },
          },
        );
      } else {
        // Save change for later when online again
        console.log("add change", addChange);
        setChanges([...changes, addChange]);
      }
    },
    [todos, isOnline],
  );

  const updateMultipleTodos = async (todos: Todo[]) => {
    const updateOrderPromises = todos.map((todo) => {
      return updateTodoMutation.mutateAsync({ ...todo });
    });
    return await Promise.all(updateOrderPromises);
  };

  const handleDeleteTodo = (id: string) => {
    // remove locally first
    setTodos(todos.filter((todo) => todo.todoId !== id));

    if (isOnline) {
      deleteTodoMutation.mutate(id, {
        onSuccess: () => {
          console.log(`deleted todo with id=${id}`);
        },
      });
    } else {
      // Save for when online again
      console.log("add delete change");
      setChanges([
        {
          type: "delete",
          todo: { todoId: id, text: "", order: 0, checked: false },
          id: crypto.randomUUID(),
        },
      ]);
    }
  };

  const handleAddNote = async (todoId: string) => {
    const noteText = "";
    try {
      await upsertNoteMutation.mutateAsync({ todoId, text: noteText });
      console.log(`added note to todo with id=${todoId}`);

      // Update local state immediately
      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.todoId === todoId
            ? { ...todo, note: { text: noteText, links: [] } }
            : todo,
        ),
      );
    } catch (error) {
      console.log(error);
      showErrorBanner("failed to add note", REGULAR_TIMEOUT_BANNER);
    }
  };

  const viewNote = async (todoId: string) => {
    try {
      let existingNote = await fetchTodoNote(todoId);

      if (!existingNote) {
        console.log("No note found, creating one...");
        await handleAddNote(todoId);
        existingNote = await fetchTodoNote(todoId);
      }

      if (!existingNote) {
        console.error(
          "Still no note found, that is odd since it was just created...",
        );
        showErrorBanner("Failed to show note", REGULAR_TIMEOUT_BANNER);
        return;
      }

      setNoteIsVisible({ todoId: todoId, note: existingNote });
    } catch (error) {
      console.log("Error fetching note:", error);
    }
  };

  const editNoteText = (todoId: string, noteText: string) => {
    upsertNoteMutation.mutate(
      { todoId, text: noteText },
      {
        onSuccess: () => {
          // Update local state immediately
          setTodos((prevTodos) =>
            prevTodos.map((todo) =>
              todo.todoId === todoId
                ? { ...todo, note: { text: noteText, links: [] } }
                : todo,
            ),
          );
          queryClient.invalidateQueries({ queryKey: ["todos", listName] });
        },
        onError: (error) => {
          console.log("error", error);
          reloadTodosList();
          showErrorBanner("failed to edit note", REGULAR_TIMEOUT_BANNER);
        },
      },
    );
  };

  return (
    <>
      {noteIsVisible !== null && (
        <Note
          todoId={noteIsVisible.todoId}
          note={noteIsVisible.note}
          editNoteText={editNoteText}
          onClose={() => setNoteIsVisible(null)}
        />
      )}
      {loadTodoData.isLoading && <p style={{ color: 'white'}}>loading...</p>}
      {loadTodoData.error && <p style={{ color: 'white'}}>{`Error: ${loadTodoData.error.message}`}</p>}
      {errorBanner && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: "#d32f2f",
            color: "white",
            textAlign: "center",
            padding: "0.5rem 2.5rem 0.5rem 0.5rem",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          {errorBanner}
          <button
            onClick={() => setErrorBanner(null)}
            style={{
              position: "absolute",
              right: "0.5rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "white",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}
      <SortableList
        items={todos.map((t) => {
          return { ...t, id: t.todoId };
        })}
        onChange={(items) => {
          const newTodos = items.map((i, idx) => {
            return {
              ...i,
              todoId: i.id,
              order: idx,
            };
          });
          const oldTodos = [...todos];
          setTodos(newTodos);
          updateMultipleTodos(newTodos)
            .then(() => reloadTodosList())
            .catch((e) => {
              setTodos(oldTodos);
              console.error("Error updating todos:", e);
            });
        }}
        renderItem={(item) => (
          <SortableList.Item id={item.id}>
            <StyledTodoRowWrapper>
              <SortableList.DragHandle />
              <TodoRow
                key={item.id}
                todo={item}
                deleteTodo={handleDeleteTodo}
                checkTodo={handleCheckTodo}
                saveTodo={handleEditTodo}
                addNewItem={() => handleAddTask(listName)}
                viewNote={viewNote}
                inputRef={(el) => {
                  if (el) {
                    todoRefs.current.set(item.todoId, el);
                  } else {
                    todoRefs.current.delete(item.todoId);
                  }
                }}
              />
            </StyledTodoRowWrapper>
          </SortableList.Item>
        )}
      />
      <div style={{ display: "flex", gap: "1rem", padding: "1rem" }}>
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
