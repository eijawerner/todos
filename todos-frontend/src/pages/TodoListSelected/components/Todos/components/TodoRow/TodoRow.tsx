import { StyledProps, Todo } from "../../../../../../common/types/Models";
import styled from "styled-components";
import React, { ChangeEvent, useContext, useEffect, useState } from "react";
import { useDebounce } from "../../../../../../common/hooks/useDebounce";
import { StyledCheckboxInput } from "../../../../../../common/components/Checkbox";
import { COLOR_BLACK } from "../../../../../../common/contants/colors";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/20/solid";
import { IconButton } from "../../../../../../common/components/IconButton/IconButton";
import { DebugContext } from "../../../../../../App";

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
  const debouncedText = useDebounce(taskText, 500);

  useEffect(() => {
    if (debouncedText === todo.text) return;
    saveTodo({
      todoId: todo.todoId,
      text: debouncedText,
      checked: todo.checked,
      order: todo.order,
    });
  }, [debouncedText]);

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
      <IconButton onClick={() => viewNote(todo.todoId)}>
        <PencilSquareIcon />
      </IconButton>
      <IconButton onClick={() => deleteTodo(todo.todoId)}>
        <TrashIcon />
      </IconButton>
    </StyledTodoRow>
  );
};
