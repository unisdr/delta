
import {disasterRecordLoader} from "~/backend.server/handlers/disaster_record";

import {ListView} from "~/frontend/disaster-record/listview";

import {
	useLoaderData,
	MetaFunction,
} from "@remix-run/react";

import {
	authLoaderPublicOrWithPerm,
} from "~/util/auth";


export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
	return disasterRecordLoader({loaderArgs})
})

export const meta: MetaFunction = () => {
	return [
		{ title: "Disaster Records - DTS" },
		{ name: "description", content: "Disaster Records Repository." },
	];
};

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">Disaster Records</h1>
					</div>
				</header>
			</div>
			<section>
				<div className="mg-container">
					<div>
						{!ld.isPublic && (<>
							<a href="/disaster-record/edit/new">New</a>
							<div className="dts-legend">
								<span className="dts-body-label">Status legend</span>
								<div className="dts-legend__item">
									<span className="dts-status dts-status--open" aria-labelledby="legend1"></span>
									<span id="legend1">Open</span>
								</div>
								<div className="dts-legend__item">
									<span className="dts-status dts-status--completed" aria-labelledby="legend2"></span>
									<span id="legend2">Completed</span>
								</div>
							</div>
						</>)}
						<ListView
							isPublic={ld.isPublic}
							basePath="/disaster-record"
						></ListView>
					</div>
				</div>
			</section>

		</>
	)
}

