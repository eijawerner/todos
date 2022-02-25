import styled from 'styled-components';
import { StyledProps, Todo, TodoListsData } from '../../../../common/types/Models';
import React, { useEffect, useState } from 'react';
import { style } from './Todos.style';
import { TodoRow } from './components/TodoRow/TodoRow';
import { Button } from '../../../../common/components/Button/Button';
import { useMutation, useQuery } from '@apollo/client';
import { queries } from '../../Queries';
import { useInterval } from '../../../../common/hooks/Time';

export type TodosProps = StyledProps & {
    listName: string;
};

const StyledTodoList = styled.ul`
  color: #84b7c3;
  list-style-type: none;
  padding: 0.5rem 0 1rem 0;
  margin: 0;
`;

function TodosBase({listName}: TodosProps) {
    const loadTodoData = useQuery<TodoListsData>(
        queries.GET_TODOS_IN_TODOLIST_WITH_NAME,
        { variables: { listName: listName}}
    )
    const [ addTodo, addTodoData] = useMutation(queries.CREATE_TODO)
    const [todos, setTodos] = useState<Todo[] | null>(null)
    const [loadingData, setLoadingData] = useState<boolean>(false)

    useEffect(() => {
        const todoList: Todo[] = (loadTodoData.data && loadTodoData.data.todoLists.length > 0 )? loadTodoData.data?.todoLists[0].todos : []
        setTodos(todoList)
    }, [listName, loadTodoData.data])

    const reloadTodosList = () => {
        loadTodoData.refetch()
            .then(r => console.log('reloaded todos'))
            .catch(error => console.log(error))
    }

    // useInterval(reloadTodosList, 2000)

    const handleAddTask = (listName: string) => {
        addTodo({
            variables: { listName: listName, task: ''}
        })
            .then(result => {
                const todoList = result.data.updateTodoLists.todoLists[0].todos
                setTodos(todoList)
                reloadTodosList()

        })
            .catch(error => console.log(error))
    }

    const handleDeletedTodo = (id: string) => {
        if (todos) {
            const updatedList = todos.filter(todo => todo.id !== id)
            setTodos(updatedList)
            reloadTodosList()
        }
    }

    const handleEditedTodo = () => {
        if (todos) {
            reloadTodosList()
        }
    }

    if (loadTodoData.loading) return <p>Loading...</p>
    if (loadTodoData.error) return <p>{`Error: ${loadTodoData.error.message}`}</p>

    return (
        <>
            { todos && <StyledTodoList>
                { todos.map((todo, idx) => (<TodoRow key={todo.id} todo={todo} onDeleted={handleDeletedTodo} onEdited={handleEditedTodo} />))}
            </StyledTodoList>}
            <Button appearance='primary' onClick={() => handleAddTask(listName)} text={'New task'} />
        </>
    );

}

export const Todos = styled(TodosBase)`
  ${style}
`