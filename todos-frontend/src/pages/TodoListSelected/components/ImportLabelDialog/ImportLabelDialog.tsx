import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { Dialog } from "../../../../common/components/Dialog/Dialog";
import { Button } from "../../../../common/components/Button/Button";
import { ErrorBanner } from "../../../../common/components/ErrorBanner/ErrorBanner";
import {
  fetchLabels,
  fetchLabelItems,
  importLabelToList,
} from "../../../../api/todoApi";
import { Label, LabelItem } from "../../../../common/types/Models";
import {
  COLOR_BLACK,
  COLOR_BEIGE,
  COLOR_DARK_BLUE,
  COLOR_GREEN,
} from "../../../../common/contants/colors";
import { StyledCheckboxInput } from "../../../../common/components/Checkbox";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

const StyledTitle = styled.h2`
  font-size: 1.8rem;
  color: ${COLOR_DARK_BLUE};
  margin: 0;
`;

const StyledHeaderRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 40vh;
  overflow-y: auto;
`;

const StyledLabelContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  background: white;
  border-radius: 0.4rem;
`;

const StyledLabelRow = styled.label`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  font-size: 1.4rem;
  color: ${COLOR_BLACK};
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }
`;

const StyledLabelName = styled.span`
  flex: 1;
`;

const StyledItemCount = styled.span`
  font-size: 1.2rem;
  color: ${COLOR_BEIGE};
`;

const StyledExpandButton = styled.button<{ $expanded: boolean }>`
  border: none;
  background: none;
  cursor: pointer;
  color: ${COLOR_DARK_BLUE};
  padding: 0.4rem;
  display: flex;
  align-items: center;

  svg {
    height: 18px;
    width: 18px;
    transform: rotate(${(props) => (props.$expanded ? "180deg" : "0deg")});
    transition: transform 0.15s ease;
  }

  &:hover {
    opacity: 0.7;
  }
`;

const StyledExpandedArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem 0.75rem 0.6rem 2.5rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 0 0 0.4rem 0.4rem;
`;

const StyledItemText = styled.span`
  font-size: 1.3rem;
  color: ${COLOR_BLACK};
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
  onManageLabels: () => void;
};

export function ImportLabelDialog({
  isVisible,
  listName,
  onClose,
  onImported,
  onManageLabels,
}: ImportLabelDialogProps) {
  const queryClient = useQueryClient();
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [expandedLabelId, setExpandedLabelId] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setSelectedLabelIds(new Set());
      setImportedCount(null);
      setExpandedLabelId(null);
    }
  }, [isVisible]);

  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: fetchLabels,
    enabled: isVisible,
  });

  const labelItemsQuery = useQuery({
    queryKey: ["labelItems", expandedLabelId],
    queryFn: () => fetchLabelItems(expandedLabelId!),
    enabled: !!expandedLabelId,
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
    },
    // Imports run sequentially, so earlier labels may have been created even
    // if a later one failed - the open list must refresh either way
    onSettled: () => {
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

  const toggleExpanded = (labelId: string) => {
    setExpandedLabelId((prev) => (prev === labelId ? null : labelId));
  };

  const handleImport = () => {
    if (selectedLabelIds.size === 0) return;
    importMutation.mutate(Array.from(selectedLabelIds));
  };

  const labels: Label[] = labelsQuery.data ?? [];
  const labelItems: LabelItem[] = labelItemsQuery.data ?? [];

  if (!isVisible) return null;

  return (
    <Dialog isVisible={isVisible} onClose={onClose}>
      <StyledHeaderRow>
        <StyledTitle>Import from label</StyledTitle>
        <Button
          text="Manage labels"
          appearance="secondary"
          size="small"
          onClick={onManageLabels}
        />
      </StyledHeaderRow>

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
          <div key={label.labelId}>
            <StyledLabelContainer>
              <StyledLabelRow>
                <StyledCheckboxInput
                  type="checkbox"
                  checked={selectedLabelIds.has(label.labelId)}
                  disabled={label.itemCount === 0}
                  onChange={() => toggleLabel(label.labelId)}
                />
                <StyledLabelName>{label.name}</StyledLabelName>
                <StyledItemCount>{label.itemCount} items</StyledItemCount>
              </StyledLabelRow>
              <StyledExpandButton
                type="button"
                aria-label={`Show items in ${label.name}`}
                $expanded={expandedLabelId === label.labelId}
                onClick={() => toggleExpanded(label.labelId)}
              >
                <ChevronDownIcon />
              </StyledExpandButton>
            </StyledLabelContainer>
            {expandedLabelId === label.labelId && (
              <StyledExpandedArea>
                {labelItemsQuery.isLoading && (
                  <StyledItemText>Loading...</StyledItemText>
                )}
                {labelItems.map((item) => (
                  <StyledItemText key={item.itemId}>{item.text}</StyledItemText>
                ))}
                {!labelItemsQuery.isLoading && labelItems.length === 0 && (
                  <StyledItemText>No items in this label.</StyledItemText>
                )}
              </StyledExpandedArea>
            )}
          </div>
        ))}
      </StyledList>

      {!labelsQuery.isLoading && labels.length === 0 && (
        <StyledEmptyText>
          No labels yet. Use "Manage labels" to create one.
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
