
/* CYPHER */
// create todo
CREATE (ee:Todo {text: 'do this too', checked: FALSE}) RETURN ee

// create user
CREATE (ee:User {name: 'eijrik', email: 'test@test.se'}) RETURN ee

// create todolist
CREATE (ee:TodoList {name: 'Att handla'}) RETURN ee

// create relationship: todoitem belongs to todolist
MATCH (todo: Todo), (list: TodoList)
WHERE todo.text = "do this" AND list.name = "Att handla"
CREATE (todo)-[:BELONGS_TO]->(list)

// create relationship: todolist created by user
MATCH (list: TodoList), (user: User)
WHERE list.name = "Att handla" AND user.name = "Eija"
CREATE (list)-[:CREATED_BY]->(user)

/* GRAPHQL */
query GetUsers {
    users {
        name
        email
    }
}

query GetTodoLists {
    todoLists {
        name
    }
}

query GetTodos {
    todos {
        text
        checked
    }
}

query GetTodosInTodoList {
    todoLists {
        name
    }
}