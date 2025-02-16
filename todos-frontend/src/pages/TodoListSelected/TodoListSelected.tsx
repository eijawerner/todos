import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useApolloClient } from "@apollo/client";
import {
  StyledProps,
  TodoList,
  TodoListsData,
} from "../../common/types/Models";
import styled from "styled-components";
import { style } from "./TodoListSelected.style";
import {
  NONE_SELECTED,
  TodoListSelector,
} from "./components/TodoListSelector/TodoListSelector";
import { Todos } from "./components/Todos/Todos";
import { Button } from "../../common/components/Button/Button";
import { queries } from "./Queries";
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

const sortByListName = (l1: TodoList, l2: TodoList) => {
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
  const todoListsLoad = useQuery<TodoListsData>(queries.GET_TODO_LISTS);
  const [selectedList, setSelectedList] = useState<string>(NONE_SELECTED);
  const [newListFormIsVisible, setNewListFormIsVisible] = useState(false);
  const [addList, addListData] = useMutation(queries.CREATE_TODOLIST_WITH_NAME);
  const client = useApolloClient();

  const [confirmDeleteDialogVisible, setConfirmDeleteDialogVisible] =
    React.useState(false);
  const handleDeleteButtonClick = () => setConfirmDeleteDialogVisible(true);

  // Online state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update network status
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

  const todoLists = todoListsLoad.data ? todoListsLoad.data.todoLists : [];

  useEffect(() => {
    if (todoLists.length > 0 && selectedList === NONE_SELECTED) {
      setSelectedList([...todoLists].sort(sortByListName)[0].name);
    }
  }, [todoLists]);

  const handleSelectTodoList = (name: string) => {
    setSelectedList(name);
  };

  const handleOpenNewListForm = () => {
    setNewListFormIsVisible(true);
  };

  const handleCreateTodoList = (name: string) => {
    addList({ variables: { listName: name } })
      .then(() => {
        setNewListFormIsVisible(false);
        todoListsLoad
          .refetch()
          .then(() => {
            setSelectedList(name);
            console.log("reloaded");
          })
          .catch((error) => console.log(error));
        console.log("added list");
      })
      .catch((error) => console.log(error));
  };

  const handleCloseOverlayClick = () => setNewListFormIsVisible(false);

  const handleDeleteList = () => {
    if (client) {
      client
        .mutate({
          mutation: queries.DELETE_TODOS_IN_TODOLIST,
          variables: { todoListName: selectedList },
        })
        .then(() => {
          client
            .mutate({
              mutation: queries.DELETE_TODOLIST,
              variables: { todoListName: selectedList },
            })
            .then(() => {
              console.log("deleted list");
              setConfirmDeleteDialogVisible(false);
              setSelectedList(NONE_SELECTED);
              todoListsLoad
                .refetch()
                .then((r) => console.log("reloaded todo lists"))
                .catch(console.log);
            })
            .catch((e) => console.error("failed to delete todos", e));
        })
        .catch((e) => console.error("failed to delete todo list", e));
    }
  };

  return (
    <div className={className}>
      <TodoListCreateForm
        isVisible={newListFormIsVisible}
        onCreateTodoList={handleCreateTodoList}
        onCloseOverlayClick={handleCloseOverlayClick}
      />

      {!isOnline && (
        <div style={{ color: "red", paddingTop: "8px" }}>Disconnected</div>
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
