import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { StyledProps, TodoListsData } from "../../common/types/Models";
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

type TodoListProps = StyledProps & {};

const StyledTodoHeader = styled.h2`
  color: #84b7c3;
  margin: 0;
`;

const TodoListSelectedUnstyled = ({ className }: TodoListProps) => {
  const todoListsLoad = useQuery<TodoListsData>(queries.GET_TODO_LISTS);
  const [selectedList, setSelectedList] = useState<string>(NONE_SELECTED);
  const [newListFormIsVisible, setNewListFormIsVisible] = useState(false);
  const [addList, addListData] = useMutation(queries.CREATE_TODOLIST_WITH_NAME);

  const todoLists = todoListsLoad.data ? todoListsLoad.data.todoLists : [];

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

  return (
    <div className={className}>
      <TodoListCreateForm
        isVisible={newListFormIsVisible}
        onCreateTodoList={handleCreateTodoList}
        onCloseOverlayClick={handleCloseOverlayClick}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          padding: "15px",
          gap: "5px",
          alignItems: "center",
        }}
      >
        <TodoListSelector
          selected={selectedList}
          todoLists={todoLists}
          onSelectTodoListChange={handleSelectTodoList}
        />
        <Button
          appearance="secondary"
          onClick={handleOpenNewListForm}
          text={"New list"}
          size={"small"}
        />
      </div>

      {selectedList !== NONE_SELECTED && (
        <>
          <StyledTodoHeader>{`${selectedList}`}</StyledTodoHeader>
          <Todos listName={selectedList} />
        </>
      )}
    </div>
  );
};

export const TodoListSelected = styled(TodoListSelectedUnstyled)`
  ${style}
`;
