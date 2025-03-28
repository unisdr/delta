import { Form, useLoaderData } from "@remix-run/react"
import { LoaderFunctionArgs } from "@remix-run/node"

export async function loader({ request, params }: LoaderFunctionArgs) {
	let url = new URL(request.url)
	let value = url.searchParams.get("type") || "none"
	let parent = params.parent || "unknown"
	return { value, parent }
}

export default function Child() {
	let { value, parent } = useLoaderData<typeof loader>()

	return (
		<div>
			<h2>Child Route</h2>
			<Form method="get">
				<label>
					Choose type:
					<select name="type">
						<option value="a">Type A</option>
						<option value="b">Type B</option>
						<option value="c">Type C</option>
					</select>
				</label>
				<button type="submit">Submit</button>
			</Form>
			<p>Selected Parent: {parent}</p>
			<p>Selected Type: {value}</p>
		</div>
	)
}

