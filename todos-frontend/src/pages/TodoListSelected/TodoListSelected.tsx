import React, { useState } from "react";
import { useQuery, useMutation, useApolloClient } from "@apollo/client";
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
import { COLOR_BLUE_SKY } from "../../common/contants/colors";
import { TodoListHeader } from "./components/TodoListHeader/TodoListHeader";

type TodoListProps = StyledProps & {};

const StyledSelectListWrapper = styled.div`
  display: flex;
  flex-direction: row;
  padding: 1.5rem;
  gap: 0.5rem;
  align-items: center;
`;

const TodoListSelectedUnstyled = ({ className }: TodoListProps) => {
  const todoListsLoad = useQuery<TodoListsData>(queries.GET_TODO_LISTS);
  const [selectedList, setSelectedList] = useState<string>(NONE_SELECTED);
  const [newListFormIsVisible, setNewListFormIsVisible] = useState(false);
  const [addList, addListData] = useMutation(queries.CREATE_TODOLIST_WITH_NAME);
  const client = useApolloClient();

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

  const handleDeleteList = () => {
    console.log(`delete list with name ${selectedList} and id`);
    if (client) {
      client
        .mutate({
          mutation: queries.DELETE_TODOLIST,
          variables: { todoListName: selectedList },
        })
        .then(() => {
          console.log("deleted list");
          // const updatedList = todoLists.filter((todoList) => todoList.name !== selectedList);
          setSelectedList(NONE_SELECTED);
          todoListsLoad
            .refetch()
            .then((r) => console.log("reloaded todo lists"))
            .catch((error) => console.log(error));
        })
        .catch(console.log);
    }
  };

  return (
    <div className={className}>
      <TodoListCreateForm
        isVisible={newListFormIsVisible}
        onCreateTodoList={handleCreateTodoList}
        onCloseOverlayClick={handleCloseOverlayClick}
      />

      <StyledSelectListWrapper>
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
      </StyledSelectListWrapper>

      {selectedList !== NONE_SELECTED && (
        <>
          <TodoListHeader
            selectedListName={selectedList}
            onDeleteList={handleDeleteList}
          />
          <Todos listName={selectedList} />
        </>
      )}
    </div>
  );
};

export const TodoListSelected = styled(TodoListSelectedUnstyled)`
  ${style}
`;
