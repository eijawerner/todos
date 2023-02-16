import { gql } from "@apollo/client";

const GET_TODO_LISTS = gql`
  query GetTodoLists {
    todoLists {
      name
    }
  }
`;

const GET_TODOS_IN_TODOLIST_WITH_NAME = gql`
  query ($listName: String!) {
    todoLists(where: { name: $listName }) {
      name
      todos {
        text
        checked
        id
      }
      todosOrder
    }
  }
`;

const CREATE_TODOLIST_WITH_NAME = gql`
  mutation ($listName: String!) {
    createTodoLists(
      input: {
        name: $listName
        todos: {}
        user: { connect: { where: { node: { name: "eijrik" } } } }
      }
    ) {
      todoLists {
        name
      }
    }
  }
`;

const UPDATE_TODOLIST_ORDER = gql`
  mutation ($listName: String!, $todosOrder: [ID!]!) {
    updateTodoLists(
        where: { name: $listName }
        update: { todosOrder: $todosOrder }
    ) {
      todoLists {
        name
      }
    }
  }
`;

const DELETE_TODOLIST = gql`
  mutation ($todoListName: String!) {
    deleteTodoLists(where: { name: $todoListName }) {
      nodesDeleted
      relationshipsDeleted
    }
  }
`;

const CREATE_TODO = gql`
  mutation ($listName: String!, $task: String!) {
    updateTodoLists(
      where: { name: $listName }
      update: { todos: { create: [{ node: { text: $task, checked: false } }] } }
    ) {
      todoLists {
        name
        todos {
          text
          checked
          id
        }
        todosOrder
      }
    }
  }
`;

const DELETE_TODO = gql`
  mutation ($todoId: ID!) {
    deleteTodos(where: { id: $todoId }) {
      nodesDeleted
      relationshipsDeleted
    }
  }
`;

const UPDATE_TODO = gql`
  mutation ($id: ID!, $text: String!, $checked: Boolean) {
    updateTodos(
      where: { id: $id }
      update: { text: $text, checked: $checked }
    ) {
      info {
        nodesCreated
        relationshipsCreated
      }
    }
  }
`;

export const queries = {
  GET_TODO_LISTS,
  GET_TODOS_IN_TODOLIST_WITH_NAME,
  CREATE_TODOLIST_WITH_NAME,
  DELETE_TODOLIST,
  CREATE_TODO,
  DELETE_TODO,
  UPDATE_TODO,
  UPDATE_TODOLIST_ORDER
};
