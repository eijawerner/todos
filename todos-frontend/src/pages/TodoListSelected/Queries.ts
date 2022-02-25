import { gql } from '@apollo/client';

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
          checked,
          id
        }
      }
    }
`;

const GET_TODOS_IN_TODOLIST_WITH_NAME = gql`
    query($listName: String!) {
      todoLists(
        where: { name: $listName} 
      ) {
        name
        todos { 
          text
          checked,
          id
        }
      },
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
            checked,
            id
          }
        }
        
      }
    }
`;

const CREATE_TODOLIST_WITH_NAME = gql`
    mutation($listName: String!) {
      createTodoLists(input: {
        name: $listName
        todos: {     }
        user: {connect: { where: { node: { name: "eijrik"}}}}
      }
      ) {
        todoLists {
          name
        }   
      }
    }
`;

const CREATE_TODO_IN_TODOLIST = gql`
    mutation {
      createTodos(input: {
        text: "new stuff",
        checked: false,
    
      }) {
        todos {
          checked,
          text,
          id
        }
      }
    }
`;

const CREATE_TODO = gql`
mutation($listName: String!, $task: String!) {
  updateTodoLists(where: { name: $listName}, update: {
    todos: {
      create: [
        { node: {text: $task, checked: false}}
      ]
    }
  } ),
  { todoLists {
    name,
    todos {
      text,
      checked,
      id
    }
  }}
  }
`;

const DELETE_TODO = gql`
mutation($todoId: ID!) {
  deleteTodos(where: {
    id: $todoId
  }) {
    nodesDeleted,
    relationshipsDeleted
  }
}
`;

const UPDATE_TODO = gql`
mutation($id: ID!, $text: String!, $checked: Boolean) {
      updateTodos(where: {id: $id}, update: { text: $text, checked: $checked}) {
        info {
          nodesCreated,
          relationshipsCreated
        }
      }
    }
`;

export const queries = {
    GET_TODO_LISTS,
    GET_TODOS_IN_TODOLIST,
    GET_TODOS_IN_TODOLIST_WITH_NAME,
    CREATE_TODOLIST_WITH_TODOS,
    CREATE_TODOLIST_WITH_NAME,
    CREATE_TODO_IN_TODOLIST,
    CREATE_TODO,
    DELETE_TODO,
    UPDATE_TODO
}