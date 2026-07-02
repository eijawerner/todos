import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { Dialog } from "../../../../common/components/Dialog/Dialog";
import { Button } from "../../../../common/components/Button/Button";
import { ErrorBanner } from "../../../../common/components/ErrorBanner/ErrorBanner";
import { fetchLabels, importLabelToList } from "../../../../api/todoApi";
import { Label } from "../../../../common/types/Models";
import {
  COLOR_BLACK,
  COLOR_BEIGE,
  COLOR_DARK_BLUE,
  COLOR_GREEN,
} from "../../../../common/contants/colors";
import { StyledCheckboxInput } from "../../../../common/components/Checkbox";

const StyledTitle = styled.h2`
  font-size: 1.8rem;
  color: ${COLOR_DARK_BLUE};
  margin: 0;
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 40vh;
  overflow-y: auto;
`;

const StyledLabelRow = styled.label`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: white;
  border-radius: 0.4rem;
  font-size: 1.4rem;
  color: ${COLOR_BLACK};
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.7);
  }
`;

const StyledLabelName = styled.span`
  flex: 1;
`;

const StyledItemCount = styled.span`
  font-size: 1.2rem;
  color: ${COLOR_BEIGE};
`;

const StyledEmptyText = styled.p`
  font-size: 1.3rem;
  color: ${COLOR_BEIGE};
  text-align: center;
  margin: 1rem 0;
`;

const StyledSuccessText = styled.p`
  font-size: 1.4rem;
  color: ${COLOR_GREEN};
  text-align: center;
  margin: 0.5rem 0;
`;

type ImportLabelDialogProps = {
  isVisible: boolean;
  listName: string;
  onClose: () => void;
  onImported: () => void;
};

export function ImportLabelDialog({
  isVisible,
  listName,
  onClose,
  onImported,
}: ImportLabelDialogProps) {
  const queryClient = useQueryClient();
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [importedCount, setImportedCount] = useState<number | null>(null);

  useEffect(() => {
    if (isVisible) {
      setSelectedLabelIds(new Set());
      setImportedCount(null);
    }
  }, [isVisible]);

  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: fetchLabels,
    enabled: isVisible,
  });

  const importMutation = useMutation({
    mutationFn: async (labelIds: string[]) => {
      let totalCreated = 0;
      for (const labelId of labelIds) {
        const created = await importLabelToList(listName, labelId);
        totalCreated += created.length;
      }
      return totalCreated;
    },
    onSuccess: (count) => {
      setImportedCount(count);
      queryClient.invalidateQueries({ queryKey: ["todos", listName] });
      onImported();
    },
  });

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) {
        next.delete(labelId);
      } else {
        next.add(labelId);
      }
      return next;
    });
  };

  const handleImport = () => {
    if (selectedLabelIds.size === 0) return;
    importMutation.mutate(Array.from(selectedLabelIds));
  };

  const labels: Label[] = (labelsQuery.data ?? []).filter((l) => l.itemCount > 0);

  if (!isVisible) return null;

  return (
    <Dialog isVisible={isVisible} onClose={onClose}>
      <StyledTitle>Import from label</StyledTitle>

      {importMutation.isError && (
        <ErrorBanner message="Failed to import label items" />
      )}

      {importedCount !== null && (
        <StyledSuccessText>
          {importedCount === 0
            ? "All items already in list"
            : `Added ${importedCount} item${importedCount !== 1 ? "s" : ""} to list`}
        </StyledSuccessText>
      )}

      {labelsQuery.isLoading && <StyledEmptyText>Loading...</StyledEmptyText>}

      <StyledList>
        {labels.map((label) => (
          <StyledLabelRow key={label.labelId}>
            <StyledCheckboxInput
              type="checkbox"
              checked={selectedLabelIds.has(label.labelId)}
              onChange={() => toggleLabel(label.labelId)}
            />
            <StyledLabelName>{label.name}</StyledLabelName>
            <StyledItemCount>{label.itemCount} items</StyledItemCount>
          </StyledLabelRow>
        ))}
      </StyledList>

      {!labelsQuery.isLoading && labels.length === 0 && (
        <StyledEmptyText>
          No labels with items. Create labels and add items via the Labels button.
        </StyledEmptyText>
      )}

      <Dialog.Actions>
        <Button text="Cancel" appearance="secondary" onClick={onClose} />
        <Button
          text="Import"
          appearance="primary"
          onClick={handleImport}
          loading={importMutation.isPending}
          disabled={selectedLabelIds.size === 0}
        />
      </Dialog.Actions>
    </Dialog>
  );
}
