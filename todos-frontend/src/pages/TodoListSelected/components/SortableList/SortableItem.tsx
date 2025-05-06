import React, { createContext, useContext, useMemo } from "react";
import type { CSSProperties, PropsWithChildren } from "react";
import type {
  DraggableSyntheticListeners,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { XMarkIcon } from "@heroicons/react/20/solid";

import styled from "styled-components";
import {
  COLOR_DARK_BLUE,
  COLOR_GREY_LIGHT,
} from "../../../../common/contants/colors";

interface Props {
  id: UniqueIdentifier;
}

interface Context {
  attributes: Record<string, any>;
  listeners: DraggableSyntheticListeners;
  ref(node: HTMLElement | null): void;
}

const SortableItemContext = createContext<Context>({
  attributes: {},
  listeners: undefined,
  ref() {},
});

const StyledDragHandleButton = styled.button`
  border-radius: 5px;
  border: none;
  margin: 0;
  padding: 0;
  cursor: pointer;

  touch-action: none;
  appearance: none;
  background-color: transparent;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:focus-visible {
    box-shadow: 0 0px 0px 2px #4c9ffe;
  }
`;

const StyledSortableItem = styled.li`
  background: ${COLOR_GREY_LIGHT};
  border-radius: 0.5rem;

  display: flex;
  justify-content: space-between;
  flex-grow: 1;
  align-items: center;

  box-sizing: border-box;
  list-style: none;
  color: #333;
  font-weight: 400;
  font-size: 1rem;
  font-family: sans-serif;
`;

const DragHandleIcon = styled.svg`
  flex: 0 0 auto;
  margin: auto;
  height: 100%;
  overflow: visible;
  fill: #919eab;
`;

export function SortableItem({ children, id }: PropsWithChildren<Props>) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id });
  const context = useMemo(
    () => ({
      attributes,
      listeners,
      ref: setActivatorNodeRef,
    }),
    [attributes, listeners, setActivatorNodeRef],
  );
  const style: CSSProperties = {
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <SortableItemContext.Provider value={context}>
      <StyledSortableItem ref={setNodeRef} style={style}>
        {children}
      </StyledSortableItem>
    </SortableItemContext.Provider>
  );
}

export function DragHandle() {
  const { attributes, listeners, ref } = useContext(SortableItemContext);

  return (
    <StyledDragHandleButton {...attributes} {...listeners} ref={ref}>
      <DragHandleIcon viewBox="0 0 20 20" width="24">
        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
      </DragHandleIcon>
    </StyledDragHandleButton>
  );
}
