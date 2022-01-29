import React from 'react';
import {
    useQuery,
    gql
} from '@apollo/client';

const GET_TODO_LISTS = gql`
    query GetTodoLists {
        todoLists {
            name
        }
    }
`;

const GET_TODOS_IN_TODOLIST = gql`
    query {
      todoLists(
        where: { name: "Att handla"} 
      ) {
        name
        todos { 
          text
          checked
        }
      }
    }
`;

const CREATE_TODOLIST_WITH_TODOS = gql`
    mutation {
      createTodoLists(input: {
        name: "en till lista"
        todos: {
          create: [
            { node: { text: "do stuff", checked: false }}
            { node: { text: "do this", checked: false }} 
          ]
        }
      }
      ) {
        todoLists {
          name,
          todos {
            text
            checked
          }
        }
        
      }
    }
`;

// Todo -[BELONGS_TO]-> TodoList
interface Todo {
    text: string;
    checked: boolean;
}

interface TodoList {
    name: string;
    todos: [Todo]
}

interface TodoListsData {
    todoLists: TodoList[]
}

export const App: React.FC = () => {
    // const { loading, error, data } = useQuery<TodoListsData>(GET_TODO_LISTS);
    const { loading, error, data } = useQuery<TodoListsData>(GET_TODOS_IN_TODOLIST);
    if (loading) return <p>Loading...</p>
    if (error) return <p>{`Error: ${error.message}`}</p>

    const todoLists = data ? data.todoLists : []

    console.log('data', data)
    return (
        <>
            <div>{`Name: ${todoLists[0].name}`}</div>
            {todoLists[0].todos.map((todo: Todo) => (
                <div key={todo.text}>
                    <p>Text: {todo.text}</p>
                </div>))}
        </>
    )
};