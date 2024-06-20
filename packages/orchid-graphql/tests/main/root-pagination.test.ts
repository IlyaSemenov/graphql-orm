import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class UserTable extends BaseTable {
  readonly table = "user"

  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    name: t.string(1, 100),
  }))
}

const db = await create_db({
  user: UserTable,
})

await db.$query`
  create table "user" (
    id serial primary key,
    name varchar(100) not null
  );
`

const schema = gql`
  type User {
    id: Int!
    name: String!
  }

  type UserPage {
    nodes: [User!]!
    cursor: ID
  }

  type Query {
    users(cursor: ID, take: Int): UserPage!
    reverse_users(cursor: ID, take: Int): UserPage!
  }
`

const graph = r.graph({
  User: r.table(db.user),
})

const resolvers: Resolvers = {
  Query: {
    async users(_parent, _args, context, info) {
      return await graph.resolvePage(
        db.user,
        r.cursor({ fields: ["name", "-id"], take: 2 }),
        {
          context,
          info,
        },
      )
    },
    async reverse_users(_parent, _args, context, info) {
      return await graph.resolvePage(
        db.user,
        r.cursor({ fields: ["-name", "-id"], take: 2 }),
        { context, info },
      )
    },
  },
}

const client = await create_client({ typeDefs: schema, resolvers })

test("root pagination", async () => {
  await db.user.createMany([
    { name: "Alice" },
    { name: "Charlie" },
    { name: "Bob" },
    { name: "Charlie" },
  ])

  function test_users(
    name: string,
    response: any,
    users: any[],
    must_have_cursor: boolean,
  ) {
    const { cursor, nodes } = response.users
    if (must_have_cursor) {
      assert.ok(cursor, `${name}: has cursor`)
    } else {
      assert.notOk(cursor, `${name}: has no cursor`)
    }
    assert.deepEqual(nodes, users, name)
    return cursor
  }

  test_users(
    "without args",
    await client.request(gql`
      {
        users {
          nodes {
            name
          }
          cursor
        }
      }
    `),
    [{ name: "Alice" }, { name: "Bob" }],
    true,
  )

  const take_1_cursor = test_users(
    "take 1",
    await client.request(gql`
      {
        users(take: 1) {
          nodes {
            name
          }
          cursor
        }
      }
    `),
    [{ name: "Alice" }],
    true,
  )

  const take_2_more_after_1_cursor = test_users(
    "take 2 more after 1",
    await client.request(
      gql`
        query more_sections($cursor: ID) {
          users(cursor: $cursor, take: 2) {
            nodes {
              id
              name
            }
            cursor
          }
        }
      `,
      {
        cursor: take_1_cursor,
      },
    ),
    [
      { name: "Bob", id: 3 },
      { name: "Charlie", id: 4 },
    ],
    true,
  )

  test_users(
    "take the rest",
    await client.request(
      gql`
        query more_sections($cursor: ID) {
          users(cursor: $cursor) {
            nodes {
              id
              name
            }
            cursor
          }
        }
      `,
      {
        cursor: take_2_more_after_1_cursor,
      },
    ),
    [{ name: "Charlie", id: 2 }],
    false,
  )

  test_users(
    "take 4",
    await client.request(gql`
      {
        users(take: 4) {
          nodes {
            id
            name
          }
          cursor
        }
      }
    `),
    [
      { name: "Alice", id: 1 },
      { name: "Bob", id: 3 },
      { name: "Charlie", id: 4 },
      { name: "Charlie", id: 2 },
    ],
    false,
  )

  test_users(
    "take 100",
    await client.request(gql`
      {
        users(take: 100) {
          nodes {
            name
          }
          cursor
        }
      }
    `),
    [
      { name: "Alice" },
      { name: "Bob" },
      { name: "Charlie" },
      { name: "Charlie" },
    ],
    false,
  )
})
