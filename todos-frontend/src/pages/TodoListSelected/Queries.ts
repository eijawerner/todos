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
        todoId
        order
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
        todosOrder: []
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
  mutation ($listName: String!, $todosOrder: [String!]!) {
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
  mutation ($listName: String!, $task: String!, $todoId: String!, $order: Float!) {
    updateTodoLists(
      where: { name: $listName }
      update: { todos: { create: [{ node: { text: $task, checked: false, todoId: $todoId, order: $order } }] } }
    ) {
      todoLists {
        name
        todos {
          text
          checked
          todoId
          order
        }
        todosOrder
      }
    }
  }
`;

const DELETE_TODO = gql`
  mutation ($todoId: String!) {
    deleteTodos(where: { todoId: $todoId }) {
      nodesDeleted
      relationshipsDeleted
    }
  }
`;

const UPDATE_TODO = gql`
  mutation ($todoId: String!, $text: String!, $checked: Boolean, $order: Float!) {
    updateTodos(
      where: { todoId: $todoId }
      update: { text: $text, checked: $checked, order: $order }
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
