import { Pagination } from "~/frontend/pagination/view";
import { MainContainer } from "./container";

interface DataScreenProps<T> {
	plural: string;
	isPublic?: boolean;
	resourceName: string;
	baseRoute: string;
	searchParams?: URLSearchParams;
	columns: string[];
	items: T[];
	paginationData: any;
	renderRow: (item: T, baseRoute: string) => React.ReactNode;
	csvExportLinks?: boolean;
	headerElement?: React.ReactNode;
	beforeListElement?: React.ReactNode;
	hideMainLinks?: boolean
}

export function DataScreen<T>(props: DataScreenProps<T>) {
	const pagination = Pagination(props.paginationData);
	return (
		<MainContainer title={props.plural}>
			<>
				{props.headerElement}
				{!props.hideMainLinks &&
					<DataMainLinks
						searchParams={props.searchParams}
						isPublic={props.isPublic}
						baseRoute={props.baseRoute}
						resourceName={props.resourceName}
						csvExportLinks={props.csvExportLinks}
					/>
				}
				{props.beforeListElement}
				{props.paginationData.totalItems ? (
					<>
						{!props.isPublic && (
							<div className="dts-legend">
								<span className="dts-body-label">Status legend</span>
								<div className="dts-legend__item">
									<span
										className="dts-status dts-status--draft"
										aria-labelledby="legend1"
									></span>
									<span id="legend1">Draft</span>
								</div>
								<div className="dts-legend__item">
									<span
										className="dts-status dts-status--completed-waiting-for-approval"
										aria-labelledby="legend2"
									></span>
									<span id="legend2">Completed / Waiting for approval</span>
								</div>
								<div className="dts-legend__item">
									<span
										className="dts-status dts-status--approved"
										aria-labelledby="legend3"
									></span>
									<span id="legend3">Approved</span>
								</div>
								<div className="dts-legend__item">
									<span
										className="dts-status dts-status--sent-for-review"
										aria-labelledby="legend4"
									></span>
									<span id="legend4">Sent for review</span>
								</div>
								<div className="dts-legend__item">
									<span
										className="dts-status dts-status--published"
										aria-labelledby="legend5"
									></span>
									<span id="legend5">Published</span>
								</div>
							</div>
						)}
						<table className="dts-table">
							<thead>
								<tr>
									{props.columns.map((col, index) => (
										<th key={index}>{col}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{props.items.map((item) =>
									props.renderRow(item, props.baseRoute)
								)}
							</tbody>
						</table>
						{pagination}
					</>
				) : (
					`No data found`
				)}
			</>
		</MainContainer>
	);
}

interface DataMainLinksProps {
	noCreate?: boolean;
	noExport?: boolean;
	noImport?: boolean;

	relLinkToNew?: string;
	isPublic?: boolean;
	baseRoute: string;
	resourceName: string;
	csvExportLinks?: boolean;
	searchParams?: URLSearchParams;

	extraButtons?: { relPath: string, label: string }[]
}

export function DataMainLinks(props: DataMainLinksProps) {
	if (props.isPublic) return null;
	let urlParams = props.searchParams ? "?" + props.searchParams.toString() : "";
	return (
		<div
			className="dts-main-container mg-grid mg-grid__col-auto"
			role="region"
			aria-label="Main container"
			style={{ marginBottom: "2rem" }}
		>
			<div
				className="mg-grid__col--span-all"
				style={{
					display: "flex",
					justifyContent: "flex-end",
					gap: "1rem",
					bottom: "1rem",
				}}
				role="navigation"
				aria-label="Main links"
			>
				{!props.noCreate &&
					<a
						href={
							props.baseRoute +
							(props.relLinkToNew
								? props.relLinkToNew + urlParams
								: "/edit/new" + urlParams)
						}
						className="mg-button mg-button--small mg-button-primary"
						role="button"
						aria-label={`Create new ${props.resourceName}`}
					>
						Add new {props.resourceName}
					</a>
				}
				{props.csvExportLinks && (
					<>
						{!props.noExport &&

							<a
								href={`${props.baseRoute}/csv-export${urlParams}`}
								className="mg-button mg-button--small mg-button-outline"
								role="button"
								aria-label="Export CSV"
							>
								CSV Export
							</a>
						}
						{!props.noImport &&

							<a
								href={`${props.baseRoute}/csv-import${urlParams}`}
								className="mg-button mg-button--small mg-button-secondary"
								role="button"
								aria-label="Import CSV"
							>
								CSV Import
							</a>
						}
					</>
				)}
				{props.extraButtons &&
					props.extraButtons.map(b =>
						<a
							href={`${props.baseRoute}/${b.relPath}${urlParams}`}
							className="mg-button mg-button--small mg-button-secondary"
							role="button"
							aria-label={b.label}
							key={b.relPath}
						>
							{b.label}
						</a>
					)
				}
			</div>
		</div>
	);
}
