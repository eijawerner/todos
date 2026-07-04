import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { Dialog } from "../../../../../../common/components/Dialog/Dialog";
import { ErrorBanner } from "../../../../../../common/components/ErrorBanner/ErrorBanner";
import { fetchLabels, addTodoToLabel } from "../../../../../../api/todoApi";
import { Label } from "../../../../../../common/types/Models";
import {
  COLOR_BLACK,
  COLOR_DARK_BLUE,
  COLOR_BEIGE,
} from "../../../../../../common/contants/colors";

const StyledTitle = styled.h2`
  font-size: 1.8rem;
  color: ${COLOR_DARK_BLUE};
  margin: 0;
`;

const StyledText = styled.p`
  font-size: 1.4rem;
  color: ${COLOR_BLACK};
  margin: 0;
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 40vh;
  overflow-y: auto;
`;

const StyledLabelButton = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border: 1px solid ${COLOR_BEIGE};
  border-radius: 0.4rem;
  background: white;
  color: ${COLOR_BLACK};
  font-size: 1.5rem;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const StyledEmpty = styled.p`
  font-size: 1.3rem;
  color: ${COLOR_BEIGE};
  text-align: center;
  margin: 1rem 0;
`;

type AddToLabelDialogProps = {
  todoId: string;
  todoText: string;
  listName: string;
  onClose: () => void;
};

// Lets the user turn a regular todo into a label-todo by choosing which
// existing label its text should become an item of.
export function AddToLabelDialog({
  todoId,
  todoText,
  listName,
  onClose,
}: AddToLabelDialogProps) {
  const queryClient = useQueryClient();

  const labelsQuery = useQuery({ queryKey: ["labels"], queryFn: fetchLabels });

  const addMutation = useMutation({
    mutationFn: (labelId: string) => addTodoToLabel(todoId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", listName] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      onClose();
    },
  });

  const labels: Label[] = labelsQuery.data ?? [];

  return (
    <Dialog isVisible={true} onClose={onClose}>
      {addMutation.isError && <ErrorBanner message="Failed to add to label" />}
      <StyledTitle>Add to label</StyledTitle>
      <StyledText>
        {`"${todoText}" will become an item in the label you choose.`}
      </StyledText>

      {labelsQuery.isLoading && <StyledEmpty>Loading...</StyledEmpty>}

      <StyledList>
        {labels.map((label) => (
          <StyledLabelButton
            key={label.labelId}
            onClick={() => addMutation.mutate(label.labelId)}
            disabled={addMutation.isPending}
          >
            {label.name}
          </StyledLabelButton>
        ))}
      </StyledList>

      {!labelsQuery.isLoading && labels.length === 0 && (
        <StyledEmpty>No labels yet. Create one in the Labels manager.</StyledEmpty>
      )}
    </Dialog>
  );
}
