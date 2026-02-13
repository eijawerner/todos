import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Button } from "../../../../common/components/Button/Button";
import styled from "styled-components";
import { ErrorBanner } from '../../../../common/components/ErrorBanner/ErrorBanner';
import { Dialog } from '../../../../common/components/Dialog/Dialog';

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 1.6rem;
`;

const StyledWarning = styled.span`
  color: red;
  font-size: 1.4rem;
`;

type TodoListCreateFormProps = {
  isVisible: boolean;
  existingListNames: string[];
  onCreateTodoList: (name: string) => void;
  onCloseOverlayClick: () => void;
  isLoading?: boolean;
  error?: string | null;
};
export function TodoListCreateForm({
  isVisible,
  existingListNames,
  onCreateTodoList,
  onCloseOverlayClick,
  isLoading = false,
  error = null,
}: TodoListCreateFormProps) {
  const [listName, setListName] = useState("");

  useEffect(() => {
    if (isVisible) {
      setListName('');
    }
  }, [isVisible])

  const nameAlreadyExists = existingListNames.some(
    (name) => name.toLocaleLowerCase() === listName.trim().toLocaleLowerCase()
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (nameAlreadyExists) return;
    onCreateTodoList(listName);
  };
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setListName(name);
  };
  return (
    <Dialog isVisible={isVisible} onClose={onCloseOverlayClick}>
      {error && <ErrorBanner message={error} />}
      {isVisible && !error && (
        <StyledForm onSubmit={handleSubmit} autoComplete="off">
          <label htmlFor="formName">List name</label>
          <input
            id={"formName"}
            value={listName}
            onChange={handleInputChange}
            placeholder={"My todo list"}
            style={{ fontSize: "1.6rem" }}
            autoFocus={true}
          />
          {nameAlreadyExists && (
            <StyledWarning>A list with this name already exists</StyledWarning>
          )}
          <Dialog.Actions>
            <Button text={"Add list"} type="submit" appearance={"primary"} loading={isLoading} disabled={nameAlreadyExists || listName.trim() === ''} />
          </Dialog.Actions>
        </StyledForm>
      )}
    </Dialog>
  );
}
