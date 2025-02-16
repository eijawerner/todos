import React, { ChangeEvent, FormEvent, useState } from "react";
import { Button } from "../../../../common/components/Button/Button";
import styled from "styled-components";
import { XMarkIcon } from "@heroicons/react/20/solid";

type StyledOverlayProps = {
  $isVisible: boolean;
 };
 const StyledOverlay = styled.div<StyledOverlayProps>`
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  pointer-events: ${(props) => (props.$isVisible ? "auto" : "none")};
  background: white;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: absolute;
  top: 0.5rem;
  width: 50vw;
  z-index: 1;
`;

const StyledButtonsContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  justify-content: end;
  padding-top: 1rem;
`;

const StyledCloseButtonContainer = styled.div`
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
`;

const StyledCloseButton = styled.button`
  cursor: pointer;
  border: none;
  border-radius: 50%;
  background: none;
`;

const StyledXMarkIcon = styled(XMarkIcon)`
  height: 20px;
  width: 20px;
`;

const StyledConfirmText = styled.h4`
  font-size: 1.75rem;
  padding: 0;
  margin: 0;
`;

type TodoListDeleteConfirmDialogProps = {
  listName: string;
  isVisible: boolean;
  deleteList: () => void;
  cancel: () => void;
};
export function TodoListDeleteConfirmDialog({
  listName,
  isVisible,
  deleteList,
  cancel,
}: TodoListDeleteConfirmDialogProps) {
  return (
    <StyledOverlay $isVisible={isVisible}>
      <StyledCloseButtonContainer>
        <StyledCloseButton onClick={cancel}>
          <StyledXMarkIcon />
        </StyledCloseButton>
      </StyledCloseButtonContainer>
      <StyledConfirmText>{`Are you sure you want to delete list ${listName}?`}</StyledConfirmText>
      <StyledButtonsContainer>
        <Button text={"cancel"} appearance={"secondary"} onClick={cancel} />
        <Button text={"OK"} appearance={"primary"} onClick={deleteList} />
      </StyledButtonsContainer>
    </StyledOverlay>
  );
}
