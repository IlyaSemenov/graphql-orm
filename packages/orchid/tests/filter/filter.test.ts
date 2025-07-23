import type { FilterModifiers, FilterValue } from "orchid-graphql"
import { filterQuery } from "orchid-graphql"
import { expect, test } from "vitest"

import { BaseTable, createDb } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		name: t.text(),
	}))

	relations = {
		posts: this.hasMany(() => PostTable, {
			columns: ["id"],
			references: ["author_id"],
		}),
	}
}

class PostTable extends BaseTable {
	readonly table = "post"

	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		text: t.text(),
		author_id: t.integer(),
		is_draft: t.boolean().default(false),
	}))
}

const db = await createDb({
	post: PostTable,
	user: UserTable,
})

await db.$query`
  create table "user" (
    id serial primary key,
    name varchar(100) not null
  );
  create table post (
    id serial primary key,
    text text not null,
    author_id integer not null,
    is_draft boolean default false
  );
`

await db.user.createMany([
	{ name: "Alice" },
	{ name: "Bob" },
	{ name: "Charlie" },
])

await db.post.createMany([
	{ author_id: 1, text: "Oil price rising." },
	{ author_id: 1, text: "Is communism dead yet?" },
	{ author_id: 2, text: "Latest COVID news." },
	{ author_id: 1, text: "Good news from China." },
	{ author_id: 2, text: "COVID vs Flu?" },
	{ author_id: 2, text: "This is draft...", is_draft: true },
])

const modifiers: FilterModifiers = {
	published: query => query.where({ is_draft: false }),
	search: (query, term: string) => query.where({ text: { contains: `%${term}%` } }),
}

test("filter by id", async () => {
	await expect(
		filterQuery(db.post.pluck("text"), { author_id: 1 }),
	).resolves.toMatchInlineSnapshot(`
		[
		  "Oil price rising.",
		  "Is communism dead yet?",
		  "Good news from China.",
		]
	`)
})

test("filter by is_draft", async () => {
	await expect(
		filterQuery(db.post.pluck("text"), { is_draft: true }),
	).resolves.toMatchInlineSnapshot(`
		[
		  "This is draft...",
		]
	`)
})

test("filter by id__in", async () => {
	await expect(
		filterQuery(db.post.pluck("id"), { id__in: [3, 5] }),
	).resolves.toMatchInlineSnapshot(`
		[
		  3,
		  5,
		]
	`)
})

test("filter by id__lt", async () => {
	await expect(
		filterQuery(db.post.pluck("id"), { id__lt: 3 }),
	).resolves.toMatchInlineSnapshot(`
    [
      1,
      2,
    ]
  `)
})

test("filter by id__lte", async () => {
	await expect(
		filterQuery(db.post.pluck("id"), { id__lte: 3 }),
	).resolves.toMatchInlineSnapshot(`
    [
      1,
      2,
      3,
    ]
  `)
})

test("filter by id__gt", async () => {
	await expect(
		filterQuery(db.post.pluck("id"), { id__gt: 4 }),
	).resolves.toMatchInlineSnapshot(`
    [
      5,
      6,
    ]
  `)
})

test("filter by id__gte", async () => {
	await expect(
		filterQuery(db.post.pluck("id"), { id__gte: 4 }),
	).resolves.toMatchInlineSnapshot(`
    [
      4,
      5,
      6,
    ]
  `)
})

test("filter by text__contains", async () => {
	await expect(
		filterQuery(db.post.pluck("text"), { text__contains: "COVID" }),
	).resolves.toMatchInlineSnapshot(`
    [
      "Latest COVID news.",
      "COVID vs Flu?",
    ]
  `)
})

test("filter by modifier (published)", async () => {
	await expect(
		filterQuery(db.post.count(), { published: true }, { modifiers }),
	).resolves.toMatchInlineSnapshot(`5`)
})

test("filter by parametrized modifier (search)", async () => {
	await expect(
		filterQuery(db.post.pluck("text"), { search: "news" }, { modifiers }),
	).resolves.toMatchInlineSnapshot(`
		[
		  "Latest COVID news.",
		  "Good news from China.",
		]
	`)
})

test("no filter", async () => {
	await expect(
		filterQuery(db.post.count(), null),
	).resolves.toMatchInlineSnapshot(`6`)
	await expect(
		filterQuery(db.post.count(), undefined),
	).resolves.toMatchInlineSnapshot(`6`)
})

test("invalid filter type", async () => {
	expect(
		() => filterQuery(db.post.count(), true as unknown as FilterValue),
	).toThrowError("Invalid filter")
	expect(
		() => filterQuery(db.post.count(), "published" as unknown as FilterValue),
	).toThrowError("Invalid filter")
})
