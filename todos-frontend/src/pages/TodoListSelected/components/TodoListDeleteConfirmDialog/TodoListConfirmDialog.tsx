import React from "react";
import { Button } from "../../../../common/components/Button/Button";
import styled from "styled-components";
import { ErrorBanner } from '../../../../common/components/ErrorBanner/ErrorBanner';
import { Dialog } from '../../../../common/components/Dialog/Dialog';

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
  isLoading?: boolean;
  error?: string | null;
};
export function TodoListDeleteConfirmDialog({
  listName,
  isVisible,
  deleteList,
  cancel,
  isLoading = false,
  error = null,
}: TodoListDeleteConfirmDialogProps) {
  return (
    <Dialog isVisible={isVisible} onClose={cancel}>
      {error && (
          <>
            <ErrorBanner message={error} />
            <Dialog.Actions>
              <Button text={"Close"} appearance={"secondary"} onClick={cancel} />
            </Dialog.Actions>
          </>
        )}
      {!error && (
        <>
          <StyledConfirmText>{`Are you sure you want to delete list ${listName}?`}</StyledConfirmText>
          <Dialog.Actions>
            <Button text={"Cancel"} appearance={"secondary"} onClick={cancel} />
            <Button text={"Delete list"} appearance={"primary"} onClick={deleteList} loading={isLoading} />
          </Dialog.Actions>
        </>
      )}
    </Dialog>
  );
}
