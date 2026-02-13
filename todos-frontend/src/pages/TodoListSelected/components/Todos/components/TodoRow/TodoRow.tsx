import { StyledProps, Todo } from "../../../../../../common/types/Models";
import styled from "styled-components";
import React, { ChangeEvent, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDebounce } from "../../../../../../common/hooks/useDebounce";
import { useClickOutside } from "../../../../../../common/hooks/useClickOutside";
import { StyledCheckboxInput } from "../../../../../../common/components/Checkbox";
import { COLOR_BLACK, COLOR_BEIGE_LIGHT, COLOR_DARK_BLUE } from "../../../../../../common/contants/colors";
import { EllipsisHorizontalIcon, PencilSquareIcon } from "@heroicons/react/20/solid";
import { IconButton } from "../../../../../../common/components/IconButton/IconButton";
import { DebugContext } from "../../../../../../App";

const hasNote = (todo: Todo) => {
  if (!todo?.note) {
    return false;
  }
  return todo.note.text.trim() !== '';
}

const StyledTextInput = styled.input<{ checked: boolean }>`
  flex-grow: 1;
  border: none;
  background-color: transparent;
  color: ${COLOR_BLACK};
  font-size: 1.6rem;
  padding: 0.5rem;
  border-radius: 4px;
  &:focus {
    outline: none;
    background: white;
  }
  text-decoration: ${(props) => (props.checked ? "line-through;" : undefined)};
`;

const StyledDebugOrderText = styled.span`
  font-size: 2rem;
  color: tomato;
`;

const StyledTodoRow = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
`;

const StyledMenuButton = styled(IconButton)`
  background: transparent;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
    filter: none;
  }

  &:active {
    background: rgba(0, 0, 0, 0.2);
    filter: none;
  }
`;

const StyledMenuWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledMenu = styled.div`
  position: absolute;
  right: 0;
  top: 100%;
  background: white;
  border-radius: 0.5rem;
  box-shadow: rgba(0, 0, 0, 0.25) 0 4px 12px;
  z-index: 10;
  min-width: 10rem;
  overflow: hidden;
`;

const StyledMenuItem = styled.button`
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 1.4rem;
  cursor: pointer;
  color: ${COLOR_DARK_BLUE};

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;

export type TodoRowProps = StyledProps & {
  todo: Todo;
  deleteTodo: (id: string) => void;
  checkTodo: (todo: Todo, checked: boolean) => void;
  saveTodo: (todo: Todo) => void;
  addNewItem: () => void;
  viewNote: (id: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
};

export const TodoRow = ({
  todo,
  deleteTodo,
  checkTodo,
  saveTodo,
  addNewItem,
  viewNote,
  inputRef,
}: TodoRowProps) => {
  const [taskText, setTaskText] = useState(todo.text);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const debouncedText = useDebounce(taskText, 500);

  // Sync local state when parent reverts on error
  useEffect(() => {
    setTaskText(todo.text);
  }, [todo.text]);

  useEffect(() => {
    if (debouncedText === todo.text) return;
    saveTodo({
      todoId: todo.todoId,
      text: debouncedText,
      checked: todo.checked,
      order: todo.order,
    });
  }, [debouncedText]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuRef, closeMenu);

  const debugEnabled = useContext(DebugContext);

  const handleClickCheckbox = (e: ChangeEvent<HTMLInputElement>) => {
    checkTodo(todo, !todo.checked);
  };

  const handleTextInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTaskText(newText);
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") {
      addNewItem();
    }
  };

  return (
    <StyledTodoRow>
      <StyledCheckboxInput
        type="checkbox"
        id="task_done"
        name={`task${todo.text}`}
        checked={todo.checked}
        value={todo.text}
        onChange={handleClickCheckbox}
      />
      <StyledTextInput
        type="text"
        id={`task_text_${todo.text}`}
        value={taskText}
        onChange={handleTextInputChange}
        onKeyUp={handleKeywordKeyPress}
        ref={inputRef}
        checked={todo.checked}
        autoComplete="false"
      />
      {debugEnabled && (
        <StyledDebugOrderText>{todo.order}</StyledDebugOrderText>
      )}
      <IconButton
        onClick={() => viewNote(todo.todoId)}
        bgColor={hasNote(todo) ? COLOR_BEIGE_LIGHT : undefined}
      >
        <PencilSquareIcon />
      </IconButton>
      <StyledMenuWrapper ref={menuRef}>
        <StyledMenuButton onClick={() => setMenuOpen(!menuOpen)}>
          <EllipsisHorizontalIcon />
        </StyledMenuButton>
        {menuOpen && (
          <StyledMenu>
            <StyledMenuItem onClick={() => { deleteTodo(todo.todoId); setMenuOpen(false); }}>
              Delete
            </StyledMenuItem>
          </StyledMenu>
        )}
      </StyledMenuWrapper>
    </StyledTodoRow>
  );
};
