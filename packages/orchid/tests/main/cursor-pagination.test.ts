import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { expect, test } from "vitest"

import type { Resolvers } from "../setup"
import { BaseTable, createClient, createDb } from "../setup"

class CursorItemTable extends BaseTable {
	readonly table = "cursor_item"

	columns = this.setColumns(t => ({
		id: t.uuid().primaryKey(),
		scenario: t.text(),
		created_at: t.timestampNoTZ(),
		occurred_at: t.timestamp(),
		document_date: t.date(),
		amount: t.decimal(),
		sort_value: t.integer().nullable(),
	}))
}

const db = await createDb({
	cursorItem: CursorItemTable,
})

await db.$query`
	create table cursor_item (
		id uuid not null,
		scenario text not null,
		created_at timestamp not null,
		occurred_at timestamptz not null default '2026-01-01T00:00:00Z',
		document_date date not null,
		amount numeric not null default 0,
		sort_value integer
	);
`

const ids = {
	a: "00000000-0000-0000-0000-000000000001",
	b: "00000000-0000-0000-0000-000000000002",
	c: "00000000-0000-0000-0000-000000000003",
	d: "00000000-0000-0000-0000-000000000004",
	e: "00000000-0000-0000-0000-000000000005",
}

await db.$query`
	insert into cursor_item (id, scenario, created_at, document_date, sort_value) values
		(${ids.a}, 'uuid', '2026-01-01', '2026-01-01', 1),
		(${ids.b}, 'uuid', '2026-01-02', '2026-01-02', 2),
		(${ids.c}, 'uuid', '2026-01-03', '2026-01-03', 3),
		(${ids.a}, 'timestamp', '2026-02-01', '2026-02-01', 1),
		(${ids.b}, 'timestamp', '2026-02-02', '2026-02-02', 2),
		(${ids.c}, 'timestamp', '2026-02-03', '2026-02-03', 3),
		(${ids.a}, 'mixed', '2026-03-02', '2026-03-01', 1),
		(${ids.b}, 'mixed', '2026-03-02', '2026-03-02', 2),
		(${ids.c}, 'mixed', '2026-03-01', '2026-03-03', 3),
		(${ids.a}, 'date', '2026-04-01', '2026-04-01', 1),
		(${ids.b}, 'date', '2026-04-02', '2026-04-02', 2),
		(${ids.c}, 'date', '2026-04-03', '2026-04-03', 3),
		(${ids.a}, 'nullable', '2026-05-02', '2026-05-01', 10),
		(${ids.b}, 'nullable', '2026-05-01', '2026-05-01', 10),
		(${ids.c}, 'nullable', '2026-05-03', '2026-05-01', 20),
		(${ids.d}, 'nullable', '2026-05-02', '2026-05-01', null),
		(${ids.e}, 'nullable', '2026-05-01', '2026-05-01', null);
`

await db.$query`
	insert into cursor_item (
		id,
		scenario,
		created_at,
		occurred_at,
		document_date,
		amount,
		sort_value
	) values
		(${ids.a}, 'timestamptz', '2026-06-01', '2026-06-01T00:00:00Z', '2026-06-01', 0, 1),
		(${ids.b}, 'timestamptz', '2026-06-02', '2026-06-02T00:00:00Z', '2026-06-02', 0, 2),
		(${ids.c}, 'timestamptz', '2026-06-03', '2026-06-03T00:00:00Z', '2026-06-03', 0, 3),
		(${ids.a}, 'numeric', '2026-07-01', '2026-07-01T00:00:00Z', '2026-07-01', 1.25, 1),
		(${ids.b}, 'numeric', '2026-07-02', '2026-07-02T00:00:00Z', '2026-07-02', 2.5, 2),
		(${ids.c}, 'numeric', '2026-07-03', '2026-07-03T00:00:00Z', '2026-07-03', 10.75, 3);
`

const schema = gql`
	type CursorItem {
		id: ID!
	}

	type CursorItemPage {
		nodes: [CursorItem!]!
		cursor: String
	}

	type Query {
		cursor_items(scenario: String!, cursor: String, take: Int): CursorItemPage!
	}
`

const graph = r.graph({
	CursorItem: r.table(db.cursorItem),
})

const scenarios = {
	uuid: { data: "uuid", order: { id: "ASC" } },
	timestamp: { data: "timestamp", order: { created_at: "ASC" } },
	timestamptz: { data: "timestamptz", order: { occurred_at: "ASC" } },
	date: { data: "date", order: { document_date: "ASC" } },
	numeric: { data: "numeric", order: { amount: "ASC" } },
	mixed: {
		data: "mixed",
		order: { created_at: "DESC", id: "ASC" },
	},
	nullable_default: {
		data: "nullable",
		order: {
			sort_value: "ASC",
			created_at: "DESC",
			id: "DESC",
		},
	},
	nullable_explicit: {
		data: "nullable",
		order: {
			sort_value: "ASC NULLS FIRST",
			created_at: "DESC",
			id: "DESC",
		},
	},
} as const

const resolvers: Resolvers = {
	Query: {
		async cursor_items(_parent, args, context, info) {
			const scenario = scenarios[args.scenario as keyof typeof scenarios]
			return await graph.resolvePage(
				db.cursorItem
					.where({ scenario: scenario.data })
					.order(scenario.order),
				r.cursor({ take: 2 }),
				{ context, info },
			)
		},
	},
}

const client = await createClient({ typeDefs: schema, resolvers })

async function getPage(
	scenario: keyof typeof scenarios,
	take: number,
	cursor?: string | null,
) {
	const response = await client.request<{
		cursor_items: { nodes: Array<{ id: string }>, cursor: string | null }
	}>(
		gql`
			query CursorItems($scenario: String!, $cursor: String, $take: Int!) {
				cursor_items(scenario: $scenario, cursor: $cursor, take: $take) {
					nodes {
						id
					}
					cursor
				}
			}
		`,
		{ scenario, cursor, take },
	)
	return response.cursor_items
}

function pageIds(page: Awaited<ReturnType<typeof getPage>>) {
	return page.nodes.map(node => node.id)
}

test.each([
	["uuid", [ids.a, ids.b], [ids.c]],
	["timestamp", [ids.a, ids.b], [ids.c]],
	["timestamptz", [ids.a, ids.b], [ids.c]],
	["date", [ids.a, ids.b], [ids.c]],
	["numeric", [ids.a, ids.b], [ids.c]],
	["mixed", [ids.a, ids.b], [ids.c]],
] as const)("paginates %s values through a second page", async (scenario, firstIds, secondIds) => {
	const first = await getPage(scenario, 2)
	const second = await getPage(scenario, 2, first.cursor)

	expect(pageIds(first)).toEqual(firstIds)
	expect(first.cursor).toEqual(expect.any(String))
	expect(pageIds(second)).toEqual(secondIds)
	expect(second.cursor).toBeNull()
})

test("uses default NULLS LAST for ascending nullable values", async () => {
	const first = await getPage("nullable_default", 3)
	const second = await getPage("nullable_default", 3, first.cursor)

	expect(pageIds(first)).toEqual([ids.a, ids.b, ids.c])
	expect(first.cursor).toEqual(expect.any(String))
	expect(pageIds(second)).toEqual([ids.d, ids.e])
	expect(second.cursor).toBeNull()
})

test("paginates from a cursor inside the null tail", async () => {
	const first = await getPage("nullable_default", 4)
	const second = await getPage("nullable_default", 4, first.cursor)

	expect(pageIds(first)).toEqual([ids.a, ids.b, ids.c, ids.d])
	expect(first.cursor).toEqual(expect.any(String))
	expect(pageIds(second)).toEqual([ids.e])
	expect(second.cursor).toBeNull()
})

test("uses explicit NULLS FIRST and continues into non-null values", async () => {
	const first = await getPage("nullable_explicit", 2)
	const second = await getPage("nullable_explicit", 2, first.cursor)
	const third = await getPage("nullable_explicit", 2, second.cursor)

	expect(pageIds(first)).toEqual([ids.d, ids.e])
	expect(first.cursor).toEqual(expect.any(String))
	expect(pageIds(second)).toEqual([ids.a, ids.b])
	expect(second.cursor).toEqual(expect.any(String))
	expect(pageIds(third)).toEqual([ids.c])
	expect(third.cursor).toBeNull()
})
