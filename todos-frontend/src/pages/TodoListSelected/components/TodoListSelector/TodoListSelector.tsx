import React, { ChangeEvent } from 'react';
import { style } from './TodoListSelector.style';
import { StyledProps, TodoList } from '../../../../common/types/Models';
import styled from 'styled-components';

export const NONE_SELECTED = 'none'

export type TodoListSelectorProps = StyledProps & {
    todoLists: TodoList[];
    onSelectTodoListChange: (todoListName: string) => void;
}
function TodoListSelectorBase({className, todoLists, onSelectTodoListChange}: TodoListSelectorProps) {

    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const selectedOption = e.target.value
        onSelectTodoListChange(selectedOption);
    };

    return (
        <div>
            {/*<label htmlFor="todolist">{'Select todo list:'}</label>*/}
            <select className={className} name={"todolist"}
                    onChange={handleSelectChange}
                    disabled={todoLists.length === 0}>
                <option key={NONE_SELECTED} value={NONE_SELECTED}>{'Please select...'}</option>
                { todoLists.map((list: TodoList) => <option key={list.name} value={list.name}>{list.name}</option>) }
            </select>
        </div>
    );
}

export const TodoListSelector = styled(TodoListSelectorBase)`
  ${style}
`