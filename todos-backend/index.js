import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from '@apollo/server/standalone';
import { gql } from "graphql-tag";
import { Neo4jGraphQL } from "@neo4j/graphql";
import neo4j from "neo4j-driver";
import 'dotenv/config'

// TODO remove todosOrder
const typeDefs = gql`
  type Todo {
    todoId: String! @unique
    text: String!
    checked: Boolean @default(value: false)
    order: Float!
  }
  
  type TodoList {
    name: String! @unique
    todos: [Todo!]! @relationship(type: "BELONGS_TO", direction: IN)
    todosOrder: [String]
    user: User! @relationship(type: "CREATED_BY", direction: OUT)
  } 

  type User {
    name: String! @unique
    email: String!
    todoLists: [TodoList!]! @relationship(type: "CREATED_BY", direction: IN)
  }
`;

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const port = process.env.PORT || 4000;

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

const server = new ApolloServer({
  schema: await neoSchema.getSchema(),
});

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => ({ req }),
  listen: { port: 4000 },
});

console.log(`🚀 Server ready at ${url}`);