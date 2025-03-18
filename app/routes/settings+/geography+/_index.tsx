import {
	authLoaderWithPerm
} from "~/util/auth";

import {NavSettings} from "~/routes/settings/nav";
import {divisionBreadcrumb, DivisionBreadcrumbRow, divisionsAllLanguages} from "~/backend.server/models/division";
import {Link, useLoaderData} from "@remix-run/react";
import {divisionTable} from "~/drizzle/schema";
import {eq, isNull, sql} from "drizzle-orm";
import {dr} from '~/db.server';

import {Pagination} from "~/frontend/pagination/view"
import {executeQueryForPagination2} from "~/frontend/pagination/api.server"

import {Breadcrumb} from "~/frontend/division";
import {MainContainer} from "~/frontend/container";

import "./style.css";

interface ItemRes {
	id: number
	nationalId: string
	hasChildren: boolean
	name: Record<string, string>
}

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const {request} = loaderArgs;

	const url = new URL(request.url);
	const parentId = Number(url.searchParams.get("parent")) || null;
	const langs = await divisionsAllLanguages(parentId);

	const selectedLangs = Object.entries(langs)
		.sort(([ak, ac], [bk, bc]) => {
			if (bc !== ac) {
				return bc - ac;
			}
			return ak.localeCompare(bk);
		})
		.slice(0, 3)
		.map(([lang]) => lang)
		.sort();

	const q1 = dr.select({
		id: divisionTable.id,
		nationalId: divisionTable.nationalId,
		name: divisionTable.name,
		hasChildren: sql<boolean>`EXISTS (
		SELECT 1
		FROM ${divisionTable} as children
		WHERE children.${divisionTable.parentId} = ${divisionTable}.id)`.as("hasChildren"),
	});

	let q2 = (q: typeof q1) => {
		return q.from(divisionTable)
			.where(parentId ? eq(divisionTable.parentId, parentId) : isNull(divisionTable.parentId))
	}

	let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
	if (parentId) {
		breadcrumbs = await divisionBreadcrumb(selectedLangs, parentId)
	}

	const res = await executeQueryForPagination2<ItemRes>(request, q1, q2, ["parent"])

	return {langs, breadcrumbs, selectedLangs, ...res};
});

type LanguageCheckboxesProps = {
	langs: Record<string, number>
	selectedLangs: string[]
}

export function LanguageCheckboxes({langs, selectedLangs}: LanguageCheckboxesProps) {
	const sortedLangs = Object.entries(langs).sort(([a], [b]) => a.localeCompare(b));

	return (
		<div>
			{sortedLangs.map(([lang, count]) => (
				<label key={lang}>
					<input
						type="checkbox"
						id={lang}
						name={lang}
						defaultChecked={selectedLangs.includes(lang)}
					/>
					{lang.toUpperCase()} ({count})
				</label>
			))}
		</div>
	);
}

type DivisionsTableProps = {
	items: ItemRes[];
	langs: string[];
};

function linkOrText(linkUrl: string, text: string | number) {
	return linkUrl ? <Link to={linkUrl}>{text}</Link> : <span>{text}</span>;
}

export function DivisionsTable({items, langs}: DivisionsTableProps) {
	return (
		<table className="dts-table">
			<thead>
				<tr>
					<th>ID</th>
					<th>National ID</th>
					{langs.map((lang) => (
						<th key={lang}>{lang.toUpperCase()}</th>
					))}
					<th></th>
				</tr>
			</thead>
			<tbody>
				{items.map((item) => {
					const linkUrl = item.hasChildren ? `?parent=${item.id}` : "";
					return (
						<tr key={item.id}>
							<td>
								{linkOrText(linkUrl, item.id)}
							</td>
							<td>
								{linkOrText(linkUrl, item.nationalId)}
							</td>
							{langs.map((lang) => (
								<td key={lang}>
									{linkOrText(linkUrl, item.name[lang] || "-")}
								</td>
							))}
							<td>
								<Link to={`/settings/geography/${item.id}`}>View</Link>&nbsp;
								<Link to={`/settings/geography/edit/${item.id}`}>Edit</Link>&nbsp;
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}


export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	const pagination = Pagination(ld.pagination)

	return (
		<MainContainer
			title="Geographic levels"
			headerExtra={<NavSettings />}
			headerAfter={
				<section>
					<div className="mg-container tabs-container">
						<ul className="tabs">
							<li className="active"><Link to="/settings/geography/">Table View</Link></li>
							<li><Link to="/settings/geography/tree">Tree View</Link></li>
						</ul>
					</div>
				</section>	
			}
		>
			<>
				<p style={{marginTop: "2.5rem"}}>
					<a href="/settings/geography/upload">Upload CSV</a>
				</p>
				{ld.pagination.totalItems > 0 ? (
					<>
						<LanguageCheckboxes langs={ld.langs} selectedLangs={ld.selectedLangs} />
						<Breadcrumb rows={ld.breadcrumbs} />
						<DivisionsTable langs={ld.selectedLangs} items={ld.items} />
						{pagination}
					</>
				) : (
					<p>No administrative divisions configured. Please upload CSV with data. See <a href="#">example</a>.</p>
				)}
			</>
		</MainContainer >
	);
}
