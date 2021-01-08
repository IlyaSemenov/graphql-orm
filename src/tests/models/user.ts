import { Model } from "objection"

import { PostModel } from "./post"
import { SectionModel } from "./section"

export class UserModel extends Model {
	static tableName = "users"
	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "posts.author_id", to: "users.id" },
			},
			default_section: {
				relation: Model.BelongsToOneRelation,
				modelClass: SectionModel,
				join: { from: "users.default_section_id", to: "sections.id" },
			},
		}
	}

	declare id: number
	declare name: string
	declare password: string
	declare posts: PostModel[]
	declare default_section_id: number | null
	declare default_section: SectionModel | null
}
