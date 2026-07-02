import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { Dialog } from "../../../../common/components/Dialog/Dialog";
import { Button } from "../../../../common/components/Button/Button";
import { ErrorBanner } from "../../../../common/components/ErrorBanner/ErrorBanner";
import {
  fetchLabels,
  createLabel,
  deleteLabel,
  fetchLabelItems,
  addLabelItem,
  editLabelItem,
  deleteLabelItem,
} from "../../../../api/todoApi";
import { Label, LabelItem } from "../../../../common/types/Models";
import {
  COLOR_BLACK,
  COLOR_GREY_LIGHT,
  COLOR_DARK_BLUE,
  COLOR_RED,
  COLOR_WHITE,
  COLOR_BEIGE,
} from "../../../../common/contants/colors";
import { TrashIcon, ChevronLeftIcon } from "@heroicons/react/20/solid";

const StyledTitle = styled.h2`
  font-size: 1.8rem;
  color: ${COLOR_DARK_BLUE};
  margin: 0;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
`;

const StyledInput = styled.input`
  flex: 1;
  border: 1px solid ${COLOR_BEIGE};
  background: white;
  color: ${COLOR_BLACK};
  font-size: 1.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;

  &:focus {
    outline: 2px solid ${COLOR_BEIGE};
  }
`;

const StyledListItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 0.4rem;
  font-size: 1.4rem;
  color: ${COLOR_BLACK};
`;

const StyledItemText = styled.span`
  flex: 1;
  cursor: pointer;
`;

const StyledItemCount = styled.span`
  font-size: 1.2rem;
  color: ${COLOR_BEIGE};
`;

const StyledDeleteButton = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  color: ${COLOR_RED};
  padding: 0.2rem;
  display: flex;
  align-items: center;

  &:hover {
    opacity: 0.7;
  }
`;

const StyledBackButton = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  color: ${COLOR_DARK_BLUE};
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 1.4rem;

  &:hover {
    opacity: 0.7;
  }
`;

const StyledEditInput = styled.input`
  flex: 1;
  border: 1px solid ${COLOR_BEIGE};
  background: white;
  color: ${COLOR_BLACK};
  font-size: 1.4rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;

  &:focus {
    outline: 2px solid ${COLOR_BEIGE};
  }
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 40vh;
  overflow-y: auto;
`;

const StyledEmptyText = styled.p`
  font-size: 1.3rem;
  color: ${COLOR_BEIGE};
  text-align: center;
  margin: 1rem 0;
`;

type LabelManagementDialogProps = {
  isVisible: boolean;
  onClose: () => void;
};

export function LabelManagementDialog({
  isVisible,
  onClose,
}: LabelManagementDialogProps) {
  const queryClient = useQueryClient();
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    if (isVisible) {
      setSelectedLabel(null);
      setNewLabelName("");
      setNewItemText("");
      setEditingItemId(null);
    }
  }, [isVisible]);

  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: fetchLabels,
    enabled: isVisible,
  });

  const labelItemsQuery = useQuery({
    queryKey: ["labelItems", selectedLabel?.labelId],
    queryFn: () => fetchLabelItems(selectedLabel!.labelId),
    enabled: !!selectedLabel,
  });

  const createLabelMutation = useMutation({
    mutationFn: (name: string) => createLabel(name),
    onSuccess: () => {
      setNewLabelName("");
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (labelId: string) => deleteLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (text: string) => addLabelItem(selectedLabel!.labelId, text),
    onSuccess: () => {
      setNewItemText("");
      queryClient.invalidateQueries({ queryKey: ["labelItems", selectedLabel?.labelId] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const editItemMutation = useMutation({
    mutationFn: ({ itemId, text }: { itemId: string; text: string }) =>
      editLabelItem(selectedLabel!.labelId, itemId, text),
    onSuccess: () => {
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ["labelItems", selectedLabel?.labelId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => deleteLabelItem(selectedLabel!.labelId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labelItems", selectedLabel?.labelId] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const handleCreateLabel = (e: FormEvent) => {
    e.preventDefault();
    if (newLabelName.trim() === "") return;
    createLabelMutation.mutate(newLabelName.trim());
  };

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (newItemText.trim() === "") return;
    addItemMutation.mutate(newItemText.trim());
  };

  const handleStartEdit = (item: LabelItem) => {
    setEditingItemId(item.itemId);
    setEditingText(item.text);
  };

  const handleSaveEdit = (itemId: string) => {
    if (editingText.trim() === "") return;
    editItemMutation.mutate({ itemId, text: editingText.trim() });
  };

  const labels: Label[] = labelsQuery.data ?? [];
  const labelItems: LabelItem[] = labelItemsQuery.data ?? [];

  if (!isVisible) return null;

  return (
    <Dialog isVisible={isVisible} onClose={onClose}>
      {createLabelMutation.isError && (
        <ErrorBanner message="Failed to create label" />
      )}

      {selectedLabel ? (
        <>
          <StyledBackButton onClick={() => setSelectedLabel(null)}>
            <ChevronLeftIcon style={{ height: "18px" }} />
            All labels
          </StyledBackButton>
          <StyledTitle>{selectedLabel.name}</StyledTitle>

          <StyledForm onSubmit={handleAddItem} autoComplete="off">
            <StyledInput
              value={newItemText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewItemText(e.target.value)}
              placeholder="New item..."
              autoFocus
            />
            <Button
              text="Add"
              type="submit"
              appearance="primary"
              size="small"
              loading={addItemMutation.isPending}
              disabled={newItemText.trim() === ""}
            />
          </StyledForm>

          {labelItemsQuery.isLoading && <StyledEmptyText>Loading...</StyledEmptyText>}

          <StyledList>
            {labelItems.map((item) => (
              <StyledListItem key={item.itemId}>
                {editingItemId === item.itemId ? (
                  <>
                    <StyledEditInput
                      value={editingText}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingText(e.target.value)}
                      onBlur={() => handleSaveEdit(item.itemId)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === "Enter") handleSaveEdit(item.itemId);
                        if (e.key === "Escape") setEditingItemId(null);
                      }}
                      autoFocus
                    />
                  </>
                ) : (
                  <>
                    <StyledItemText onClick={() => handleStartEdit(item)}>
                      {item.text}
                    </StyledItemText>
                    <StyledDeleteButton onClick={() => deleteItemMutation.mutate(item.itemId)}>
                      <TrashIcon style={{ height: "16px" }} />
                    </StyledDeleteButton>
                  </>
                )}
              </StyledListItem>
            ))}
          </StyledList>

          {!labelItemsQuery.isLoading && labelItems.length === 0 && (
            <StyledEmptyText>No items yet. Add one above.</StyledEmptyText>
          )}
        </>
      ) : (
        <>
          <StyledTitle>Labels</StyledTitle>

          <StyledForm onSubmit={handleCreateLabel} autoComplete="off">
            <StyledInput
              value={newLabelName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewLabelName(e.target.value)}
              placeholder="New label name..."
              autoFocus
            />
            <Button
              text="Create"
              type="submit"
              appearance="primary"
              size="small"
              loading={createLabelMutation.isPending}
              disabled={newLabelName.trim() === ""}
            />
          </StyledForm>

          {labelsQuery.isLoading && <StyledEmptyText>Loading...</StyledEmptyText>}

          <StyledList>
            {labels.map((label) => (
              <StyledListItem key={label.labelId}>
                <StyledItemText onClick={() => setSelectedLabel(label)}>
                  {label.name}
                </StyledItemText>
                <StyledItemCount>{label.itemCount} items</StyledItemCount>
                <StyledDeleteButton onClick={() => deleteLabelMutation.mutate(label.labelId)}>
                  <TrashIcon style={{ height: "16px" }} />
                </StyledDeleteButton>
              </StyledListItem>
            ))}
          </StyledList>

          {!labelsQuery.isLoading && labels.length === 0 && (
            <StyledEmptyText>No labels yet. Create one above.</StyledEmptyText>
          )}
        </>
      )}
    </Dialog>
  );
}
