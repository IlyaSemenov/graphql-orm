---
"orchid-graphql": major
---

Cursor pagination now follows the complete query ordering correctly, including nullable fields, explicit null placement, mixed directions, and UUID, date, timestamp, and numeric cursor values.
This release requires Orchid ORM 1.51 or newer; as a result, `contains` filters accept plain substring values without SQL wildcard syntax.
