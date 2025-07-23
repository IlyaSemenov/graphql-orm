import type { QueryBuilder } from "objection"
import { Model, ref } from "objection"
import type { FilterModifiers, FilterValue } from "objection-graphql-resolver"
import { filterQuery } from "objection-graphql-resolver"
import { expect, test } from "vitest"

import { setupDb } from "../setup"

class UserModel extends Model {
	static tableName = "user"

	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "user.id", to: "post.author_id" },
			},
		}
	}

	id?: number
	name?: string
	posts?: PostModel[]
}

class PostModel extends Model {
	static tableName = "post"

	static get relationMappings() {
		return {
			author: {
				relation: Model.BelongsToOneRelation,
				modelClass: UserModel,
				join: { from: "post.author_id", to: "user.id" },
			},
		}
	}

	static modifiers = {
		published(query: QueryBuilder<PostModel>) {
			query.where(ref("post.is_draft"), false)
		},
	}

	id?: number
	text?: string
	is_draft?: boolean
	author_id?: number
	author?: UserModel
}

const knex = await setupDb()

await knex.schema.createTable("user", (user) => {
	user.increments("id").notNullable().primary()
	user.string("name").notNullable()
})

await knex.schema.createTable("post", (post) => {
	post.increments("id").notNullable().primary()
	post.string("text").notNullable()
	post.boolean("is_draft").notNullable().defaultTo(false)
	post.integer("author_id").notNullable().references("user.id")
})

await UserModel.query().insertGraph([
	{ name: "Alice" },
	{ name: "Bob" },
	{ name: "Charlie" },
])

await PostModel.query().insertGraph(
	[
		{ author_id: 1, text: "Oil price rising." },
		{ author_id: 1, text: "Is communism dead yet?" },
		{ author_id: 2, text: "Latest COVID news." },
		{ author_id: 1, text: "Good news from China." },
		{ author_id: 2, text: "COVID vs Flu?" },
		{ author_id: 2, text: "This is draft...", is_draft: true },
	],
	{ relate: true },
)

const modifiers: FilterModifiers = {
	search: (query, term: string) => query.where({ text: { contains: `%${term}%` } }),
}

test("filter by id", async () => {
	await expect(
		filterQuery(PostModel.query().select("text"), { author_id: 1 }),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "text": "Oil price rising.",
		  },
		  {
		    "text": "Is communism dead yet?",
		  },
		  {
		    "text": "Good news from China.",
		  },
		]
	`)
})

test("filter by is_draft", async () => {
	await expect(
		filterQuery(PostModel.query().select("id"), { is_draft: true }),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "id": 6,
		  },
		]
	`)
})

test("filter by id__in", async () => {
	await expect(
		filterQuery(PostModel.query().select("id"), { id__in: [3, 5] }),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "id": 3,
		  },
		  {
		    "id": 5,
		  },
		]
	`)
})

test("filter by id__lt", async () => {
	await expect(
		filterQuery(PostModel.query().select("id"), { id__lt: 3 }),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "id": 1,
		  },
		  {
		    "id": 2,
		  },
		]
	`)
})

test("filter by id__lte", async () => {
	await expect(
		filterQuery(PostModel.query().select("id"), { id__lte: 3 }),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "id": 1,
		  },
		  {
		    "id": 2,
		  },
		  {
		    "id": 3,
		  },
		]
	`)
})

test("filter by id__gt", async () => {
	await expect(
		filterQuery(PostModel.query().select("id"), { id__gt: 4 }),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "id": 5,
		  },
		  {
		    "id": 6,
		  },
		]
	`)
})

test("filter by id__gte", async () => {
	await expect(
		filterQuery(PostModel.query().select("id"), { id__gte: 4 }),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "id": 4,
		  },
		  {
		    "id": 5,
		  },
		  {
		    "id": 6,
		  },
		]
	`)
})

test("filter by text__like", async () => {
	await expect(
		filterQuery(PostModel.query().select("text"), { text__like: "COVID" }),
	).resolves.toMatchInlineSnapshot(`[]`)
})

test("filter by model modifier (published)", async () => {
	await expect(
		filterQuery(PostModel.query().count(), { published: true }, { modifiers }),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "count(*)": 5,
		  },
		]
	`)
})

test("filter by parametrized modifier (search)", async () => {
	await expect(
		filterQuery(PostModel.query().select("text"), { search: "news" }, { modifiers }),
	).resolves.toMatchInlineSnapshot(`[]`)
})

test("no filter", async () => {
	await expect(
		filterQuery(PostModel.query().count(), null),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "count(*)": 6,
		  },
		]
	`)
	await expect(
		filterQuery(PostModel.query().count(), undefined),
	).resolves.toMatchInlineSnapshot(`
		[
		  {
		    "count(*)": 6,
		  },
		]
	`)
})

test("invalid filter type", async () => {
	expect(
		() => filterQuery(PostModel.query().count(), true as unknown as FilterValue),
	).toThrowError("Invalid filter")
	expect(
		() => filterQuery(PostModel.query().count(), "published" as unknown as FilterValue),
	).toThrowError("Invalid filter")
})
