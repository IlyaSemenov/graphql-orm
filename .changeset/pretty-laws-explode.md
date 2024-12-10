---
"objection-graphql-resolver": minor
"orchid-graphql": minor
---

Refactor cursor pagination:

- Expect explicit list of fields to sort on.
- If not provided, take the list of sort fields from the query itself.
- Fix crash on naming clash when e.g. paginating over `id` with subquery also having `id`.
