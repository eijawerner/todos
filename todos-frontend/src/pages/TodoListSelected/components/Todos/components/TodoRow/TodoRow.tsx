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
  moveTodoToFirstInList: (todoId: string) => void;
  moveTodoToLastInList: (todoId: string) => void;
  onEdited: () => void;
  addNewItem: () => void;
  inputRef?: React.Ref<HTMLInputElement>
};

function TodoRowBase({ className, todo, deleteTodo, moveTodoToFirstInList, moveTodoToLastInList, onEdited, addNewItem, inputRef }: TodoRowProps) {
  const [rowChecked, setRowChecked] = useState(todo.checked);
  const [taskText, setTaskText] = useState(todo.text);
  const [editTodo, editTodoData] = useMutation(queries.UPDATE_TODO);

  const handleClickCheckbox = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = !rowChecked;
    if (checked) {
      moveTodoToLastInList(todo.todoId);
    } else {
      moveTodoToFirstInList(todo.todoId);
    }
    setRowChecked(checked);
    editTodo({ variables: { todoId: todo.todoId, text: todo.text, checked: checked } })
      .then(() => {
        onEdited();
      })
      .catch((error) => {
        console.log(error);
        setRowChecked(!checked);
      });
  };

  const handleTextInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTaskText(newText);
  };

  const handleSaveTask = () => {
    editTodo({
        variables: { todoId: todo.todoId, text: taskText, checked: todo.checked },
      })
        .then(() => {
          onEdited();
        })
        .catch((error) => {
          console.log(error);
        });
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
          checked={rowChecked}
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
          checked={rowChecked}
        />
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
