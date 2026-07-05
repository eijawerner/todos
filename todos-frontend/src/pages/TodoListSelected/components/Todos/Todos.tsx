import styled from "styled-components";
import {
  StyledProps,
  RegularTodo,
  Todo,
  TodoNote,
  isLabelTodo,
} from "../../../../common/types/Models";
import React, { useEffect, useState, ReactNode, useRef, useMemo } from "react";
import { style } from "./Todos.style";
import { TodoRow } from "./components/TodoRow/TodoRow";
import { Button } from "../../../../common/components/Button/Button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTodos } from "../../../../api/todoApi";
import { COLOR_GREY_LIGHT, COLOR_RED, COLOR_WHITE } from "../../../../common/contants/colors";
import { outbox } from "../../../../sync/outbox";
import { useOutbox } from "../../../../sync/useOutbox";
import { applyOps } from "../../../../sync/overlay";
import { computeOrderBetween } from "../../../../sync/order";
import { Op } from "../../../../sync/opTypes";
import {
  buildAddTodoOp,
  buildSetTextOp,
  buildSetCheckedOp,
  buildMoveOp,
  buildDeleteTodoOp,
  buildSetNoteOp,
} from "../../../../sync/buildOps";
import { useSwipeToDismiss } from "../../../../common/hooks/useSwipeToDismiss";
import { Note } from "./components/Note/Note";
import { AddToLabelDialog } from "./components/AddToLabelDialog/AddToLabelDialog";
import { SortableList } from "../SortableList/SortableList";
import { HeaderBanner } from "../../../../common/components/HeaderBanner/HeaderBanner";
import { REGULAR_TIMEOUT_BANNER, UNDO_DELETE_TIMEOUT } from '../../../../common/contants/numbers';
import { TrashIcon } from '@heroicons/react/20/solid';

export type TodosProps = StyledProps & {
  listName: string;
  onManageLabels?: () => void;
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
  padding: 0.5rem 0.75rem;
`;

const SwipeableRow= ({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: ReactNode;
}) => {
  const { onTouchStart, onTouchMove, onTouchEnd, offsetX, isSwiping } =
    useSwipeToDismiss(onDelete);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          background: COLOR_RED,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: "2rem",
          color: COLOR_WHITE,
          fontSize: "1.6rem",
          borderRadius: "0.5rem"
        }}
      >
          <TrashIcon style={{height: "24px"}} />
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease",
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Given the todo ids before and after a single drag, returns the id that moved
// (or null if nothing changed). Used to emit ONE fractional move op instead of
// renumbering the whole list.
function findMovedId(oldIds: string[], newIds: string[]): string | null {
  if (oldIds.length !== newIds.length) return null;
  let start = 0;
  while (start < oldIds.length && oldIds[start] === newIds[start]) start++;
  if (start === oldIds.length) return null; // unchanged
  let end = oldIds.length - 1;
  while (end >= 0 && oldIds[end] === newIds[end]) end--;
  // The moved item is either the one that slid down (oldIds[start] === newIds[end])
  // or the one that slid up (newIds[start]).
  return newIds[end] === oldIds[start] ? newIds[end] : newIds[start];
}

function TodosBase({ listName, onManageLabels }: TodosProps) {
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [deletedTodo, setDeletedTodo] = useState<{ todo: Todo; opId: string } | null>(null);
  const [noteIsVisible, setNoteIsVisible] = useState<{
    todoId: string;
    note: TodoNote;
  } | null>(null);
  const [todoToAddToLabel, setTodoToAddToLabel] = useState<Todo | null>(null);

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFocusRef = useRef<string | null>(null);
  const todoRefs = useRef<Map<string, HTMLInputElement>>(new Map());

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
  };

  const queryClient = useQueryClient();

  // Server state, polled. Polling pauses while the outbox has unsent ops so a
  // refetch can't clobber the local overlay mid-edit; a successful flush
  // invalidates and resumes it (wired in index.tsx / below).
  const loadTodoData = useQuery({
    queryKey: ["todos", listName],
    queryFn: () => fetchTodos(listName),
    refetchInterval: () => (outbox.isEmpty() ? 12_000 : false),
    refetchOnWindowFocus: true,
  });

  // The rendered list = server todos with pending ops overlaid, sorted.
  const pendingOps = useOutbox(listName);
  const todos = useMemo(
    () => applyOps(loadTodoData.data ?? [], pendingOps),
    [loadTodoData.data, pendingOps],
  );

  const enqueue = (op: Op) => outbox.enqueue(op);

  // A transient network failure is retried by the outbox (not reverted); only a
  // server rejection surfaces to the user.
  useEffect(() => {
    outbox.setOnOpsRejected(() => {
      showErrorBanner("Some changes couldn't be saved", REGULAR_TIMEOUT_BANNER);
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    });
  }, [queryClient]);

  const setFocusToTodo = (todoId: string) => {
    const ref = todoRefs.current.get(todoId);
    if (ref) ref.focus();
  };

  // Focus a newly added todo once it has rendered from the overlay.
  useEffect(() => {
    if (pendingFocusRef.current) {
      setFocusToTodo(pendingFocusRef.current);
      pendingFocusRef.current = null;
    }
  }, [todos]);

  const reloadTodosList = () => {
    queryClient.invalidateQueries({ queryKey: ["todos", listName] });
  };

  // Emit a single fractional move, or renumber the whole list when the gap
  // between neighbours is exhausted.
  const repositionOrRenormalize = (
    movedId: string,
    prevOrder: number | null,
    nextOrder: number | null,
    finalOrder: Todo[],
  ) => {
    const result = computeOrderBetween(prevOrder, nextOrder);
    if (result === "renormalize") {
      finalOrder.forEach((t, i) => enqueue(buildMoveOp(listName, t.todoId, i + 1)));
    } else {
      enqueue(buildMoveOp(listName, movedId, result));
    }
  };

  const handleCheckTodo = (todo: Todo, checked: boolean) => {
    enqueue(buildSetCheckedOp(listName, todo.todoId, checked));

    // Keep the checked-first UX: move the toggled todo to the boundary between
    // the checked and unchecked groups — one move instead of N.
    const others = todos.filter((t) => t.todoId !== todo.todoId);
    const checkedOthers = others.filter((t) => t.checked);
    const uncheckedOthers = others.filter((t) => !t.checked);
    const prevOrder = checkedOthers.length ? checkedOthers[checkedOthers.length - 1].order : null;
    const nextOrder = uncheckedOthers.length ? uncheckedOthers[0].order : null;
    const finalOrder = [...checkedOthers, { ...todo, checked }, ...uncheckedOthers];
    repositionOrRenormalize(todo.todoId, prevOrder, nextOrder, finalOrder);
  };

  const handleEditTodo = (todo: Todo) => {
    if (isLabelTodo(todo)) return; // label-todo text is owned by its LabelItem
    enqueue(buildSetTextOp(listName, todo.todoId, todo.text));
  };

  const handleAddTask = (listName: string) => {
    const uuid = crypto.randomUUID();
    const order = todos.length > 0 ? todos[todos.length - 1].order + 1.0 : 1.0;
    const newTodoItem: RegularTodo = {
      text: "",
      todoId: uuid,
      checked: false,
      order,
    };
    pendingFocusRef.current = uuid; // focus once it renders
    enqueue(buildAddTodoOp(listName, newTodoItem));
  };

  const handleDeleteTodo = (id: string) => {
    const todoToDelete = todos.find((todo) => todo.todoId === id);

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const deleteOp = buildDeleteTodoOp(listName, id);
    if (todoToDelete) {
      setDeletedTodo({ todo: todoToDelete, opId: deleteOp.opId });
      undoTimeoutRef.current = setTimeout(() => {
        setDeletedTodo(null);
        undoTimeoutRef.current = null;
      }, UNDO_DELETE_TIMEOUT);
    }
    enqueue(deleteOp);
  };

  const undoDelete = () => {
    if (!deletedTodo) return;
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    const { todo, opId } = deletedTodo;
    setDeletedTodo(null);

    if (outbox.getOps().some((o) => o.opId === opId)) {
      // The delete hasn't flushed yet — cancel it and the todo reappears from
      // the server overlay (fixes the lost-undo bug by construction).
      outbox.cancelOp(opId);
    } else {
      // Already flushed and deleted server-side — recreate from the snapshot
      // (a label-todo keeps its link; its note is re-added too).
      enqueue(buildAddTodoOp(listName, todo));
      if (todo.note && todo.note.text) {
        enqueue(buildSetNoteOp(listName, todo.todoId, todo.note.text));
      }
    }
  };

  const viewNote = (todoId: string) => {
    // The note ships with the todos query, so open straight from the overlay.
    const todo = todos.find((t) => t.todoId === todoId);
    setNoteIsVisible({ todoId, note: todo?.note ?? { text: "", links: [] } });
  };

  const editNoteText = (todoId: string, noteText: string) => {
    enqueue(buildSetNoteOp(listName, todoId, noteText));
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
      {todoToAddToLabel !== null && (
        <AddToLabelDialog
          todoId={todoToAddToLabel.todoId}
          todoText={todoToAddToLabel.text}
          listName={listName}
          onClose={() => setTodoToAddToLabel(null)}
        />
      )}
      {loadTodoData.isLoading && <p style={{ color: 'white'}}>loading...</p>}
      {loadTodoData.error && <p style={{ color: 'white'}}>{`Error: ${loadTodoData.error.message}`}</p>}
      {errorBanner && (
        <HeaderBanner
          message={errorBanner}
          onClose={() => setErrorBanner(null)}
        />
      )}
      {deletedTodo && (
        <HeaderBanner
          message="Task deleted"
          mode="success"
          action={{ label: "Undo", onClick: undoDelete }}
          onClose={() => {
            if (undoTimeoutRef.current) {
              clearTimeout(undoTimeoutRef.current);
              undoTimeoutRef.current = null;
            }
            setDeletedTodo(null);
          }}
        />
      )}
      {!loadTodoData.isLoading && !loadTodoData.error && (
        <>
      <SortableList
        items={todos.map((t) => {
          return { ...t, id: t.todoId };
        })}
        onChange={(items) => {
          const oldIds = todos.map((t) => t.todoId);
          const newIds = items.map((i) => i.id);
          const movedId = findMovedId(oldIds, newIds);
          if (!movedId) return;

          const byId = new Map(todos.map((t) => [t.todoId, t]));
          const k = newIds.indexOf(movedId);
          const prevOrder = k > 0 ? byId.get(newIds[k - 1])!.order : null;
          const nextOrder = k < newIds.length - 1 ? byId.get(newIds[k + 1])!.order : null;
          const finalOrder = newIds.map((id) => byId.get(id)!);
          repositionOrRenormalize(movedId, prevOrder, nextOrder, finalOrder);
        }}
        renderItem={(item) => (
          <SortableList.Item id={item.id}>
            <SwipeableRow onDelete={() => handleDeleteTodo(item.todoId)}>
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
                  addToLabel={setTodoToAddToLabel}
                  inputRef={(el) => {
                    if (el) {
                      todoRefs.current.set(item.todoId, el);
                    } else {
                      todoRefs.current.delete(item.todoId);
                    }
                  }}
                />
              </StyledTodoRowWrapper>
            </SwipeableRow>
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
          onClick={() => onManageLabels?.()}
          text={"Labels"}
        />
        <Button
          appearance="secondary"
          onClick={() => reloadTodosList()}
          text={"sync"}
        />
      </div>
        </>
      )}
    </>
  );
}

export const Todos = styled(TodosBase)`
  ${style}
`;
