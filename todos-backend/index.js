const neo4j = require("neo4j-driver");
const { gql, ApolloServer } = require("apollo-server-express");
const { Neo4jGraphQL, Neo4jGraphQLSubscriptionsSingleInstancePlugin } = require("@neo4j/graphql");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");
const express = require('express');
const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core");

require("dotenv").config();

const typeDefs = gql`
  type Todo {
    id: ID! @id
    text: String!
    checked: Boolean @default(value: false)
  }
  
  type TodoList {
    name: String! @unique
    todos: [Todo!]! @relationship(type: "BELONGS_TO", direction: IN)
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

const neoSchema = new Neo4jGraphQL({ 
  typeDefs, 
  driver, 
  plugins: {
    subscriptions: new Neo4jGraphQLSubscriptionsSingleInstancePlugin()}
  });

async function main() {
  const app = express();
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({
      server: httpServer,
      path: "/graphql",
  });

  const schema = await neoSchema.getSchema();
  const serverCleanup = useServer({
      schema
  }, wsServer);

  const server = new ApolloServer({
    cors: true,
    csrfPrevention: false,
      schema,
      plugins: [
          ApolloServerPluginDrainHttpServer({
              httpServer
          }),
          {
              async serverWillStart() {
                  return {
                      async drainServer() {
                          await serverCleanup.dispose();
                      },
                  };
              },
          },
      ],
  });
  await server.start();

  const corsOptions = {
    origin: ["http://localhost:3000"]
  };
  server.applyMiddleware({
      app,
      cors: corsOptions,
      path: "/",
  });

  const PORT = 4000;
  httpServer.listen(PORT, () => {
      console.log(`Server is now running on http://localhost:${PORT}`);
  });
}

main();

