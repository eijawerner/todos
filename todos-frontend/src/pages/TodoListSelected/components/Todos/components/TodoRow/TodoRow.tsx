import { StyledProps, Todo } from '../../../../../../common/types/Models';
import styled from 'styled-components';
import { style } from './TodoRow.style';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { Button } from '../../../../../../common/components/Button/Button';
import { useApolloClient, useMutation, useSubscription } from '@apollo/client';
import { queries } from '../../../../Queries';

export type TodoRowProps = StyledProps & {
    todo: Todo;
    onDeleted: (id: string) => void
    onEdited: () => void
};

function TodoRowBase({className, todo, onDeleted, onEdited}: TodoRowProps) {
    const [rowChecked, setRowChecked] = useState(todo.checked);
    const [taskText, setTaskText] = useState(todo.text);
    const [editTodo, editTodoData] = useMutation(queries.UPDATE_TODO);
    const { data, loading, error } = useSubscription(queries.TODO_SUBSCRIPTION);
    const client = useApolloClient()

    useEffect(() => {
        console.log("loading", loading);
        console.log("data", data);
        console.log("error", error);
    }, [loading, data, error])

    const handleClickCheckbox = (e: ChangeEvent<HTMLInputElement>) => {
        const checked = !rowChecked
        setRowChecked(checked);
        editTodo({ variables: { id: todo.id, text: todo.text, checked: checked }})
            .then(() => {
                onEdited()
        }).catch((error) => {
            console.log(error)
            setRowChecked(!checked);
        })
    }

    const handleTextInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newText = e.target.value
        setTaskText(newText);
        editTodo({ variables: { id: todo.id, text: newText, checked: todo.checked }})
            .then(() => {
                onEdited()
            }).catch((error) => {
            console.log(error)
        })
    }

    const handleDeleteTask = () => {
        if (client) {
            client
                .mutate({
                    mutation: queries.DELETE_TODO,
                    variables: { todoId: todo.id}
                })
                .then(result => {
                    onDeleted(todo.id)
                })
                .catch(error => console.log(error))
        }

    }

    return (
        <li className={className}>
            <div style={{ display: 'flex', flexDirection: 'row',
                alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', padding: '0.5rem 0', margin: '0 8px'}}>
                <input type="checkbox"
                       id="task_done"
                       name={`task${todo.text}`}
                       checked={rowChecked}
                       value={todo.text}
                       onChange={handleClickCheckbox} style={{ margin: 0, padding: 0}} />
                <input type="text"
                       id={`task_text_${todo.text}`}
                       value={taskText}
                       onChange={handleTextInputChange} style={{ border: 'none', background: 'transparent', width: '50vw'}} />
                <Button appearance='secondary' size={'small'} onClick={handleDeleteTask} text={'delete'} />
            </div>
        </li>
    );
}

export const TodoRow = styled(TodoRowBase)`
  ${style}
`;