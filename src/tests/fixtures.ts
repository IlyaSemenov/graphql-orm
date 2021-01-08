import { PostModel } from "./models/post"
import { SectionModel } from "./models/section"
import { UserModel } from "./models/user"

export async function create_objects() {
	await SectionModel.query().insertGraph([
		{ id: 1, slug: "news", name: "News" },
		{ id: 2, slug: "editorial", name: "Editorial" },
		{ id: 3, slug: "covid", name: "COVID-19" },
	])

	await UserModel.query().insertGraph([
		{ id: 1, name: "John", password: "secret", default_section_id: 1 },
		{ id: 2, name: "Mary", password: "mary123" },
	])

	await PostModel.query().insertGraph(
		[
			{ id: 1, author_id: 1, section_id: 1, text: "Oil price rising." },
			{ id: 2, author_id: 1, section_id: 2, text: "Is communism dead yet?" },
			{ id: 3, author_id: 2, section_id: 3, text: "Latest COVID figures." },
			{ id: 4, author_id: 2, section_id: 1, text: "Good news from China." },
			{ id: 5, author_id: 2, section_id: 1, text: "More good news!" },
			{ id: 6, author_id: 1, section_id: 3, text: "COVID vs Flu?" },
			{
				id: 7,
				author_id: 1,
				section_id: 1,
				text: "This is a draft",
				is_published: false,
			},
		],
		{ relate: true },
	)
}
