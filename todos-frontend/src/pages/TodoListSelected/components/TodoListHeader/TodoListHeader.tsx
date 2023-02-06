import React from "react";
import styled from "styled-components";
import { Button } from "../../../../common/components/Button/Button";
import { COLOR_BLUE_SKY } from "../../../../common/contants/colors";
import { TodoListDeleteConfirmDialog } from "../TodoListDeleteConfirmDialog/TodoListConfirmDialog";

const StyledTodoHeaderName = styled.h2`
  color: ${COLOR_BLUE_SKY};
  margin: 0;
`;

const StyledTodoHeaderWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
`;

type TodoListHeaderProps = {
  selectedListName: string;
  onDeleteList: () => void;
};
export const TodoListHeader = ({
  selectedListName,
  onDeleteList,
}: TodoListHeaderProps) => {
  const [confirmDeleteDialogVisible, setConfirmDeleteDialogVisible] =
    React.useState(false);
  const handleDeleteButtonClick = () => setConfirmDeleteDialogVisible(true);
  return (
    <>
      <StyledTodoHeaderWrapper>
        <StyledTodoHeaderName>{`${selectedListName}`}</StyledTodoHeaderName>
        <Button
          text={"delete"}
          appearance={"secondary"}
          size="small"
          onClick={handleDeleteButtonClick}
        />
      </StyledTodoHeaderWrapper>
      <TodoListDeleteConfirmDialog
        listName={selectedListName}
        isVisible={confirmDeleteDialogVisible}
        deleteList={onDeleteList}
        cancel={() => setConfirmDeleteDialogVisible(false)}
      />
    </>
  );
};
