
import { Pagination } from "~/frontend/pagination/view";
import { MainContainer } from "./container";

interface DataScreenProps<T> {
	plural: string;
	isPublic?: boolean;
	resourceName: string;
	baseRoute: string;
	columns: string[];
	items: T[];
	paginationData: any;
	renderRow: (item: T, baseRoute: string) => React.ReactNode;
	csvExportLinks?: boolean;
}

export function DataScreen<T>(props: DataScreenProps<T>) {
	const pagination = Pagination(props.paginationData);

	return (
		<MainContainer title={props.plural}>
			<>
				<DataMainLinks isPublic={props.isPublic} baseRoute={props.baseRoute} resourceName={props.resourceName} csvExportLinks={props.csvExportLinks} />
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
}

export function DataMainLinks(props: DataMainLinksProps) {
	if (props.isPublic) return null;

	return (
		<div className="dts-main-container mg-grid mg-grid__col-auto" role="region" aria-label="Main container">
			<div className="mg-grid__col--span-all" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', bottom: '1rem' }} role="navigation" aria-label="Main links">
				<a href={props.baseRoute + (props.relLinkToNew ? props.relLinkToNew : "/edit/new")} className="mg-button mg-button--small mg-button-primary" role="button" aria-label={`Create new ${props.resourceName}`}>New {props.resourceName}</a>
				{props.csvExportLinks && (
					<>
						<a href={`${props.baseRoute}/csv-export`} className="mg-button mg-button--small mg-button-outline" role="button" aria-label="Export CSV">CSV Export</a>
						<a href={`${props.baseRoute}/csv-import`} className="mg-button mg-button--small mg-button-outline" role="button" aria-label="Import CSV">CSV Import</a>
					</>
				)}
			</div>
		</div>
	);
}
