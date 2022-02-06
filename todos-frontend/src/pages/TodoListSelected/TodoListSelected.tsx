import React, { useState } from 'react';
import {
    useQuery,
    ApolloClient,
    InMemoryCache
} from '@apollo/client';
import { StyledProps, Todo, TodoList, TodoListsData } from '../../common/types/Models';
import styled from 'styled-components';
import { style } from './TodoListSelected.style';
import { NONE_SELECTED, TodoListSelector } from './components/TodoListSelector/TodoListSelector';
import { Todos } from './components/Todos/Todos';
import { Button } from '../../common/components/Button/Button';
import { queries } from './Queries';

type TodoListProps =  StyledProps & {
    client?: ApolloClient<InMemoryCache>
};

const StyledTodoHeader = styled.h2`
  color: #84b7c3;
`;

const TodoListSelectedUnstyled = ({ className, client }: TodoListProps) => {
    const todoListsLoad = useQuery<TodoListsData>(queries.GET_TODO_LISTS)
    const [selectedList, setSelectedList ] = useState<string>(NONE_SELECTED)

    const todoLists = todoListsLoad.data ? todoListsLoad.data.todoLists : []

    const handleAddList = () => {
        if (client) {
            client
                .query({
                    query: queries.CREATE_TODOLIST_WITH_NAME,
                    variables: { listName: 'new list'}
                })
                .then(result => console.log(result))
                .catch(error => console.log(error))
        }
    }

    const handleSelectTodoList = (name: string) => {
        setSelectedList(name)
    }


    return (
        <div className={className}>
            <div style={{ display: 'flex', flexDirection: 'row', padding: '15px', gap: '5px', alignItems: 'center'}}>
                <TodoListSelector todoLists={todoLists} onSelectTodoListChange={handleSelectTodoList} />
                <Button type='primary' onClick={handleAddList} text={"New list"} size={'small'} />
            </div>

            { selectedList !== NONE_SELECTED && (
                <>
                    <StyledTodoHeader>{`${selectedList}`}</StyledTodoHeader>
                    <Todos listName={selectedList} />
                </>
            )}

        </div>
    )
};

export const TodoListSelected = styled(TodoListSelectedUnstyled)`
 ${style}
`