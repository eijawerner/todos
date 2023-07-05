import { StyledProps, Todo } from "../../../../../../common/types/Models";
import styled from "styled-components";
import { style } from "./TodoRow.style";
import React, { ChangeEvent, useState } from "react";
import { Button } from "../../../../../../common/components/Button/Button";
import { useMutation } from "@apollo/client";
import { queries } from "../../../../Queries";
import { StyledCheckboxInput } from "../../../../../../common/components/Checkbox";
import { COLOR_BLACK } from "../../../../../../common/contants/colors";

const StyledTextInput = styled.input<{checked: boolean}>`
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
  text-decoration: ${props => props.checked ? 'line-through;': undefined}
`;

export type TodoRowProps = StyledProps & {
  todo: Todo;
  deleteTodo: (id: string) => void;
  checkTodo: (todo: Todo, checked: boolean) => void;
  saveTodo: (todo: Todo) => void;
  addNewItem: () => void;
  inputRef?: React.Ref<HTMLInputElement>
};

function TodoRowBase({ className, todo, deleteTodo, checkTodo, saveTodo, addNewItem, inputRef }: TodoRowProps) {
  const [taskText, setTaskText] = useState(todo.text);

  const handleClickCheckbox = (e: ChangeEvent<HTMLInputElement>) => {
    checkTodo(todo, !todo.checked);
  };

  const handleTextInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTaskText(newText);
  };

  const handleSaveTask = () => {
    const newTodo = { todoId: todo.todoId, text: taskText, checked: todo.checked, order: todo.order };
    saveTodo(newTodo);
  }

  const handleKeywordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if( e.key == 'Enter' ){
      addNewItem()
    }
  };

  return (
    <li className={className} onBlur={handleSaveTask}>
      <div>
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
        />
        <div>{`(${todo.order})`}</div>
        <Button
          appearance="secondary"
          size={"small"}
          onClick={() => deleteTodo(todo.todoId)}
          text={"delete"}
        />
      </div>
    </li>
  );
}

export const TodoRow = styled(TodoRowBase)`
  ${style}
`;
