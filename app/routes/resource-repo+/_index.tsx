
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
						{!ld.isPublic && (<>
							<a href="/resource-repo/edit/new">New</a>
							<div className="dts-legend">
								<span className="dts-body-label">Status legend</span>
								<div className="dts-legend__item">
									<span className="dts-status dts-status--draft" aria-labelledby="legend1"></span>
									<span id="legend1">Draft</span>
								</div>
								<div className="dts-legend__item">
									<span className="dts-status dts-status--published" aria-labelledby="legend2"></span>
									<span id="legend2">Published</span>
								</div>
								<div className="dts-legend__item">
									<span className="dts-status dts-status--rejected" aria-labelledby="legend3"></span>
									<span id="legend3">Rejected</span>
								</div>
							</div>
						</>)}
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

