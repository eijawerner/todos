import React, { useCallback, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { StyledProps, TodoListResponse } from "../../common/types/Models";
import styled from "styled-components";
import { style } from "./TodoListSelected.style";
import {
  NONE_SELECTED,
  TodoListSelector,
} from "./components/TodoListSelector/TodoListSelector";
import { Todos } from "./components/Todos/Todos";
import { Button } from "../../common/components/Button/Button";
import { IconButton } from "../../common/components/IconButton/IconButton";
import { TagIcon, TrashIcon } from "@heroicons/react/20/solid";
import { HeaderBanner } from "../../common/components/HeaderBanner/HeaderBanner";
import {
  fetchTodoLists,
  createTodoList,
  deleteTodoList,
} from "../../api/todoApi";
import { isAxiosError } from "axios";
import { TodoListCreateForm } from "./components/TodoListCreateForm/TodoListCreateForm";
import { TodoListDeleteConfirmDialog } from "./components/TodoListDeleteConfirmDialog/TodoListConfirmDialog";
import { LabelManagementDialog } from "./components/LabelManagementDialog/LabelManagementDialog";
import { useOutboxCount } from "../../sync/useOutbox";

type TodoListProps = StyledProps & {};

const StyledSelectListWrapper = styled.div`
  display: flex;
  flex-direction: row;
  padding: 1.5rem;
  gap: 0.5rem;
  align-items: center;
`;

const getErrorMessage = (error: Error, headerMessage: string): string => {
  if (isAxiosError(error) && error.response?.data?.error) {
    return `${headerMessage}: ${error.response.data.error}`;
  }
  return headerMessage;
};

const sortByListName = (l1: TodoListResponse, l2: TodoListResponse) => {
  const listName1 = l1.name.toLocaleLowerCase();
  const listName2 = l2.name.toLocaleLowerCase();
  if (listName1 < listName2) {
    return -1;
  } else if (listName1 > listName2) {
    return 1;
  }
  return 0;
};

// Remember the last-opened list across reloads.
const SELECTED_LIST_KEY = "todos.selectedList.v1";

const TodoListSelectedUnstyled = ({ className }: TodoListProps) => {
  const queryClient = useQueryClient();
  const todoListsQuery = useQuery({
    queryKey: ["todoLists"],
    queryFn: fetchTodoLists,
  });

  const [selectedList, setSelectedList] = useState<string>(
    () => localStorage.getItem(SELECTED_LIST_KEY) ?? NONE_SELECTED,
  );
  // Select a list and remember it so a reload returns to it.
  const selectList = useCallback((name: string) => {
    setSelectedList(name);
    localStorage.setItem(SELECTED_LIST_KEY, name);
  }, []);
  const [newListFormIsVisible, setNewListFormIsVisible] = useState(false);
  const addListMutation = useMutation({
    mutationFn: (name: string) => createTodoList(name),
    onSuccess: (_data, name) => {
      setNewListFormIsVisible(false);
      queryClient.invalidateQueries({ queryKey: ["todoLists"] });
      selectList(name);
    },
    onError: (error) => {
      console.error('failed to add list', error);
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (name: string) => deleteTodoList(name),
    onSuccess: () => {
      setConfirmDeleteDialogVisible(false);
      setSelectedList(NONE_SELECTED);
      queryClient.invalidateQueries({ queryKey: ["todoLists"] });
    },
    onError: (error) => {
      console.error('failed to delete list', error);
    },
  });

  const [confirmDeleteDialogVisible, setConfirmDeleteDialogVisible] =
    React.useState(false);
  const handleDeleteButtonClick = () => {
    deleteListMutation.reset();
    setConfirmDeleteDialogVisible(true);
  };

  const [labelDialogVisible, setLabelDialogVisible] = useState(false);

  // Online state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const pendingCount = useOutboxCount();

  useEffect(() => {
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);

    return () => {
      window.removeEventListener("online", handleStatusChange);
      window.removeEventListener("offline", handleStatusChange);
    };
  }, [isOnline]);

  const todoLists: TodoListResponse[] = todoListsQuery.data ?? [];

  // Once lists load, keep the current selection if it still exists (e.g. the
  // one restored from localStorage); otherwise fall back to the first list.
  useEffect(() => {
    if (todoLists.length === 0) return;
    const stillExists = todoLists.some((l) => l.name === selectedList);
    if (!stillExists) {
      selectList([...todoLists].sort(sortByListName)[0].name);
    }
  }, [todoLists]);

  const handleSelectTodoList = (name: string) => {
    selectList(name);
  };

  const handleOpenNewListForm = () => {
    addListMutation.reset();
    setNewListFormIsVisible(true);
  };

  const handleCreateTodoList = (name: string) => {
    addListMutation.mutate(name);
  };

  const handleDeleteList = () => {
    deleteListMutation.mutate(selectedList);
  };

  return (
    <div className={className}>
      <TodoListCreateForm
        isVisible={newListFormIsVisible}
        existingListNames={todoLists.map((l) => l.name)}
        onCreateTodoList={handleCreateTodoList}
        cancel={() => setNewListFormIsVisible(false)}
        isLoading={addListMutation.isPending}
        error={addListMutation.isError ? getErrorMessage(addListMutation.error, "Failed to create list") : null}
      />

      {!isOnline && (
        <HeaderBanner message="Disconnected" />
      )}
      {pendingCount > 0 && (
        <HeaderBanner
          message={`Syncing ${pendingCount} change${pendingCount > 1 ? "s" : ""}…`}
          mode="success"
        />
      )}
      <LabelManagementDialog
        isVisible={labelDialogVisible}
        onClose={() => setLabelDialogVisible(false)}
        listName={selectedList !== NONE_SELECTED ? selectedList : null}
      />

      <StyledSelectListWrapper>
        <div style={{ marginRight: "2rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Button
            appearance="secondary"
            onClick={handleOpenNewListForm}
            text={"New list"}
            size={"small"}
          />
          <IconButton
            size="small"
            onClick={() => setLabelDialogVisible(true)}
            aria-label="Manage labels"
            title="Manage labels"
          >
            <TagIcon />
          </IconButton>
        </div>
        <TodoListSelector
          selected={selectedList}
          todoLists={[...todoLists].sort(sortByListName)}
          onSelectTodoListChange={handleSelectTodoList}
        />
        <IconButton
          size="small"
          onClick={handleDeleteButtonClick}
          aria-label="Delete selected list"
          title="Delete selected list"
        >
          <TrashIcon />
        </IconButton>
      </StyledSelectListWrapper>

      <TodoListDeleteConfirmDialog
        listName={selectedList}
        isVisible={confirmDeleteDialogVisible}
        deleteList={handleDeleteList}
        cancel={() => setConfirmDeleteDialogVisible(false)}
        isLoading={deleteListMutation.isPending}
        error={deleteListMutation.isError ? getErrorMessage(deleteListMutation.error, "Failed to delete list") : null}
      />

      {selectedList !== NONE_SELECTED && (
        <Todos
          listName={selectedList}
          onManageLabels={() => setLabelDialogVisible(true)}
        />
      )}
    </div>
  );
};

export const TodoListSelected = styled(TodoListSelectedUnstyled)`
  ${style}
`;
