import Knex from "knex"
import { Model, QueryBuilder, ref } from "objection"
import { assert } from "tap"

export class UserModel extends Model {
	static tableName = "users"
	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "posts.author_id", to: "users.id" },
			},
		}
	}

	declare id: number
	declare name: string
	declare posts: PostModel[]
}

export class SectionModel extends Model {
	static tableName = "sections"
	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "posts.section_id", to: "sections.id" },
			},
		}
	}

	declare id: number
	declare slug: string
	declare name: string
	declare posts: PostModel[]
}

export class PostModel extends Model {
	static tableName = "posts"
	static get relationMappings() {
		return {
			author: {
				relation: Model.BelongsToOneRelation,
				modelClass: UserModel,
				join: { from: "posts.author_id", to: "users.id" },
			},
			section: {
				relation: Model.BelongsToOneRelation,
				modelClass: SectionModel,
				join: { from: "posts.section_id", to: "sections.id" },
			},
		}
	}

	static modifiers = {
		"graphql.select.url": (query: QueryBuilder<PostModel>) =>
			query
				.select(ref("title"))
				.withGraphFetched("section(section_slug)")
				.modifiers({
					section_slug: (query) => query.select("slug"),
				}),
	}

	declare id: number
	declare title: string | null
	declare text: string | null
	declare author: UserModel
	declare section: SectionModel

	get url() {
		assert(
			this.id !== undefined &&
				this.title !== undefined &&
				(this.section === null || this.section?.slug !== undefined),
		)
		return (
			(this.section ? `/${this.section.slug}` : "") +
			`/${this.title}-${this.id}`
		)
	}
}

export async function create_tables(knex: Knex) {
	await knex.schema.createTable("users", function (table) {
		table.integer("id").primary()
		table.string("name")
	})
	await knex.schema.createTable("sections", function (table) {
		table.integer("id").primary()
		table.string("slug").notNullable().unique()
		table.string("name")
	})
	await knex.schema.createTable("posts", function (table) {
		table.integer("id").primary()
		table.string("title")
		table.string("text")
		table.integer("author_id").notNullable()
		table.foreign("author_id").references("id").inTable("users")
		table.integer("section_id")
		table.foreign("section_id").references("id").inTable("sections")
	})
}
