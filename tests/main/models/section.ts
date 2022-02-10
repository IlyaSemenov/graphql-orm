import assert from "assert"
import { Model } from "objection"

import { PostModel } from "./post"

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

	get url() {
		assert(this.slug !== undefined)
		return `/${this.slug}`
	}
}
