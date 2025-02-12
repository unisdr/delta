
import { Pagination } from "~/frontend/pagination/view";
import { MainContainer } from "./container";

interface DataScreenProps<T> {
	plural: string;
	isPublic?: boolean;
	resourceName: string;
	baseRoute: string;
	searchParams?: URLSearchParams
	columns: string[];
	items: T[];
	paginationData: any;
	renderRow: (item: T, baseRoute: string) => React.ReactNode;
	csvExportLinks?: boolean;
	headerElement?: React.ReactNode
}

export function DataScreen<T>(props: DataScreenProps<T>) {
	const pagination = Pagination(props.paginationData);
	return (
		<MainContainer title={props.plural}>
			<>
				{props.headerElement}
				<DataMainLinks searchParams={props.searchParams} isPublic={props.isPublic} baseRoute={props.baseRoute} resourceName={props.resourceName} csvExportLinks={props.csvExportLinks} />
				{props.paginationData.totalItems ? (
					<>
						<table className="dts-table">
							<thead>
								<tr>
									{props.columns.map((col, index) => (
										<th key={index}>{col}</th>
									))}
								</tr>
							</thead>
							<tbody>{props.items.map((item) => props.renderRow(item, props.baseRoute))}</tbody>
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
	relLinkToNew?: string
	isPublic?: boolean;
	baseRoute: string;
	resourceName: string;
	csvExportLinks?: boolean;
	searchParams?: URLSearchParams
}

export function DataMainLinks(props: DataMainLinksProps) {
	if (props.isPublic) return null;
	let urlParams = props.searchParams ? "?" + props.searchParams.toString() : ""
	return (
		<div className="dts-main-container mg-grid mg-grid__col-auto" role="region" aria-label="Main container" style={{ marginBottom: '2rem' }}>
			<div className="mg-grid__col--span-all" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', bottom: '1rem' }} role="navigation" aria-label="Main links">
				<a href={props.baseRoute + (props.relLinkToNew ? props.relLinkToNew + urlParams : "/edit/new" + urlParams)} className="mg-button mg-button--small mg-button-primary" role="button" aria-label={`Create new ${props.resourceName}`}>Add new {props.resourceName}</a>
				{props.csvExportLinks && (
					<>
						<a href={`${props.baseRoute}/csv-export${urlParams}`} className="mg-button mg-button--small mg-button-outline" role="button" aria-label="Export CSV">CSV Export</a>
						<a href={`${props.baseRoute}/csv-import${urlParams}`} className="mg-button mg-button--small mg-button-secondary" role="button" aria-label="Import CSV">CSV Import</a>
					</>
				)}
			</div>
		</div>
	);
}
