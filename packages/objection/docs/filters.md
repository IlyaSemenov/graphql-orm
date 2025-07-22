# Filters

Both root and nested queries can be filtered with GraphQL arguments:

```gql
scalar Filter

type Query {
  posts(filter: Filter): [Post!]!
}

query get_all_posts {
  posts(filter: { date: "2020-10-01", author_id__in: [123, 456] }) {
    id
    text
  }
}
```

The above generates:

```sql
SELECT id, text FROM posts WHERE date='2020-10-01' AND author_id IN (123, 456)
```

## Enabling filters

For security purposes, filters are disabled by default.

Filters can be enabled for individual relations:

```ts
const graph = r.graph({
  User: r.model(UserModel, {
    fields: {
      id: true,
      name: true,
      posts: r.relation({ filters: true }),
    },
  }),
  Post: r.model(PostModel),
})
```

or on model level:

```ts
const graph = r.graph({
  User: r.model(UserModel, {
    // enable filters on all user relations
    allowAllFilters: true,
  }),
  Post: r.model(PostModel),
})
```

or on graph level:

```ts
const graph = r.graph(
  {
    User: r.model(UserModel),
    Post: r.model(PostModel),
  },
  {
    // enable filters on all relations
    allowAllFilters: true,
  },
)
```

## Filters on root query

To filter root query (if not enabled for model or graph), use:

```ts
const resolvers = {
  Query: {
    posts: async (parent, args, context, info) => {
      return graph.resolve(Post.query(), { context, info, filters: true })
    },
  },
}
```

## Syntax

```js
const filter = {
  field: value,
  field__operator: value,
}
```

Supported operators:

- no operator / exact comparison (also works for `null` values)
- `lt`, `lte`, `gt`, `gte`
- `like`, `ilike`
- `in` (expects an array of scalars)

## Filtering with model modifiers

Define modifiers on a model class:

```ts
class PostModel extends Model {
  static modifiers = {
    public: query => query.whereNull("delete_time"),
    search: (query, term) => query.where("text", "ilike", `%${term}%`),
  }
}
```

Then you can filter results with:

```gql
query get_all_posts {
  posts(filter: { public: true, search: "hello" }) {
    id
    text
  }
}
```

Modifier filters take precedence over database field filters.

## Reusing Filters for External Queries

There are cases where you need to apply the same filtering logic across multiple queries—even those not originating from GraphQL. For example, you might want to return a filtered list of objects, and then meta data about that filtered list of objects.

To achieve this, use the `filterQuery` function:

```ts
import { filterQuery } from "objection-graphql-resolver"

const posts = await filterQuery(
  // Base query to filter
  PostModel.query(),
  // Filter object, e.g. { public: true }
  filterObject,
  // Option - not required
  {
    modifiers, // Additional model modifiers
    context, // Pass to modifiers
  }
)
```
