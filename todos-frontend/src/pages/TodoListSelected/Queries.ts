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
        order,
        note {
          text
        }
      }
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

const DELETE_TODOS = gql`
  mutation ($todoIds: [String!]!) {
    deleteTodos(where: { todoId_IN: $todoIds }) {
      nodesDeleted
      relationshipsDeleted
    }
  }
`;

const DELETE_TODOS_IN_TODOLIST = gql`
  mutation ($todoListName: String!) {
   deleteTodos(where: { list: { name: $todoListName } }) {
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

const CREATE_TODO_NOTE = gql`
  mutation ($todoId: String!, $noteText: String!) {
    updateTodos(
      where: { todoId: $todoId }
      update: { note: { create: { node: { text: $noteText, links: [] } } } }
      ) {
      todos {
        todoId,
        note {
          text
        }
      }
    }
  }
`;

const GET_TODO_NOTE = gql`
  query ($todoId: String!) {
    todos(where: { todoId: $todoId }) {
      note {
        text
      }
    }
  }
`;

const UPDATE_TODO_NOTE = gql`
  mutation ($todoId: String!, $noteText: String!) {
    updateTodos(
    where: { todoId: $todoId }
    update: { note: { update: { node: { text: $noteText, links: [] } } } }
  ) {
      todos {
        note {
          text
        }
      }
    }
  }
`;

const DELETE_TODO_NOTE_BELONGING_TO_TODO = gql`
  mutation ($todoId: String!) {
    deleteTodoNotes(
      where: {
        todo: {
          todoId: $todoId
        }
      }
    ) {
      nodesDeleted
      relationshipsDeleted
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
  DELETE_TODOS,
  DELETE_TODOS_IN_TODOLIST,
  UPDATE_TODO,
  CREATE_TODO_NOTE,
  GET_TODO_NOTE,
  UPDATE_TODO_NOTE,
  DELETE_TODO_NOTE_BELONGING_TO_TODO
};
