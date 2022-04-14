import assert from "assert"
import { Model, QueryBuilder } from "objection"

import { SectionModel } from "./section"
import { UserModel } from "./user"

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
		is_draft(query: QueryBuilder<PostModel>) {
			query.where("is_published", false)
		},
		search(query: QueryBuilder<PostModel>, term: string) {
			query.where("text", "like", `%${term}%`)
		},
		under_default_section(
			query: QueryBuilder<PostModel>,
			{ user_id }: { user_id: string }
		) {
			query.runBefore(async function () {
				const { default_section_id } = await UserModel.query(
					this.context().transaction
				).findById(user_id)
				this.where("section_id", default_section_id)
			})
		},
	}

	declare id: number
	declare is_published: boolean
	declare text: string
	declare author_id: number
	declare author: UserModel
	declare section_id: number
	declare section: SectionModel

	get url() {
		assert(this.id !== undefined && this.section?.slug !== undefined)
		return `/${this.section.slug}/${this.id}`
	}
}
