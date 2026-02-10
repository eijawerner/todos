import React, { useEffect, useState } from "react";
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
import { Banner } from "../../common/components/Banner/Banner";
import {
  fetchTodoLists,
  createTodoList,
  deleteTodoList,
} from "../../api/todoApi";
import { TodoListCreateForm } from "./components/TodoListCreateForm/TodoListCreateForm";
import { TodoListDeleteConfirmDialog } from "./components/TodoListDeleteConfirmDialog/TodoListConfirmDialog";

type TodoListProps = StyledProps & {};

const StyledSelectListWrapper = styled.div`
  display: flex;
  flex-direction: row;
  padding: 1.5rem;
  gap: 0.5rem;
  align-items: center;
`;

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

const TodoListSelectedUnstyled = ({ className }: TodoListProps) => {
  const queryClient = useQueryClient();
  const todoListsQuery = useQuery({
    queryKey: ["todoLists"],
    queryFn: fetchTodoLists,
  });

  const [selectedList, setSelectedList] = useState<string>(NONE_SELECTED);
  const [newListFormIsVisible, setNewListFormIsVisible] = useState(false);

  const addListMutation = useMutation({
    mutationFn: (name: string) => createTodoList(name),
    onSuccess: (_data, name) => {
      setNewListFormIsVisible(false);
      queryClient.invalidateQueries({ queryKey: ["todoLists"] });
      setSelectedList(name);
    },
    onError: (error) => console.log(error),
  });

  const deleteListMutation = useMutation({
    mutationFn: (name: string) => deleteTodoList(name),
    onSuccess: () => {
      setConfirmDeleteDialogVisible(false);
      setSelectedList(NONE_SELECTED);
      queryClient.invalidateQueries({ queryKey: ["todoLists"] });
    },
    onError: (error) => console.error("failed to delete list", error),
  });

  const [confirmDeleteDialogVisible, setConfirmDeleteDialogVisible] =
    React.useState(false);
  const handleDeleteButtonClick = () => setConfirmDeleteDialogVisible(true);

  // Online state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  useEffect(() => {
    if (todoLists.length > 0 && selectedList === NONE_SELECTED) {
      setSelectedList(
        [...todoLists].sort(sortByListName)[0].name,
      );
    }
  }, [todoLists]);

  const handleSelectTodoList = (name: string) => {
    setSelectedList(name);
  };

  const handleOpenNewListForm = () => {
    setNewListFormIsVisible(true);
  };

  const handleCreateTodoList = (name: string) => {
    addListMutation.mutate(name);
  };

  const handleCloseOverlayClick = () => setNewListFormIsVisible(false);

  const handleDeleteList = () => {
    deleteListMutation.mutate(selectedList);
  };

  return (
    <div className={className}>
      <TodoListCreateForm
        isVisible={newListFormIsVisible}
        onCreateTodoList={handleCreateTodoList}
        onCloseOverlayClick={handleCloseOverlayClick}
      />

      {!isOnline && (
        <Banner message="Disconnected" />
      )}

      <StyledSelectListWrapper>
        <div style={{ marginRight: "2rem" }}>
          <Button
            appearance="secondary"
            onClick={handleOpenNewListForm}
            text={"New list"}
            size={"small"}
          />
        </div>
        <TodoListSelector
          selected={selectedList}
          todoLists={[...todoLists].sort(sortByListName)}
          onSelectTodoListChange={handleSelectTodoList}
        />
        <Button
          text={"delete"}
          appearance={"secondary"}
          size="small"
          onClick={handleDeleteButtonClick}
        />
      </StyledSelectListWrapper>

      <TodoListDeleteConfirmDialog
        listName={selectedList}
        isVisible={confirmDeleteDialogVisible}
        deleteList={handleDeleteList}
        cancel={() => setConfirmDeleteDialogVisible(false)}
      />

      {selectedList !== NONE_SELECTED && <Todos listName={selectedList} />}
    </div>
  );
};

export const TodoListSelected = styled(TodoListSelectedUnstyled)`
  ${style}
`;
