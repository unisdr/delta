
import {resourceRepoLoader} from "~/backend.server/handlers/resourcerepo";

import {ListView} from "~/frontend/resource-repo/listview";

import {
	useLoaderData,
} from "@remix-run/react";

import {
	authLoaderPublicOrWithPerm,
} from "~/util/auth";


export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
	return resourceRepoLoader({loaderArgs})
})

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">PDNA Resources Repository</h1>
					</div>
				</header>
			</div>
			<section>
				<div className="mg-container">
					<div>
						{!ld.isPublic && (
							<a href="/resource-repo/edit/new">New</a>
						)}
						<ListView
							isPublic={ld.isPublic}
							basePath="/resource-repo"
						></ListView>
					</div>
				</div>
			</section>

		</>
	)
}

