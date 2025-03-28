import {Link, Outlet, useLoaderData} from "@remix-run/react"
import {LoaderFunctionArgs} from "@remix-run/server-runtime"

export async function loader({ params }: LoaderFunctionArgs) {
	let parent = params.parent || "unknown"
	return { parent }
}

export default function Parent() {
	let data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Parent</h1>
			<Link to="/examples/multiple-loaders/parent/parent1/child">Parent 1</Link>
			<Link to="/examples/multiple-loaders/parent/parent2/child">Parent 2</Link>
			<p>{data.parent}</p>
			<Outlet />
		</div>
	)
}
