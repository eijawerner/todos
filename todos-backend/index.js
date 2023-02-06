const { gql, ApolloServer } = require("apollo-server");
const { Neo4jGraphQL } = require("@neo4j/graphql");
const neo4j = require("neo4j-driver");
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

// test
const port = process.env.PORT || 4000;

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });
neoSchema.getSchema()
    .then((schema) => {
        const server = new ApolloServer({
            schema: schema
        });

        server.listen({ port: port }).then(({ url }) => {
            console.log(`GraphQL server ready on ${url}`);
        });
    }).catch(error => console.log(error));

