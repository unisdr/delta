
import {Pagination} from "~/frontend/pagination/view";
import {MainContainer} from "./container";

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
	isPublic?: boolean;
	baseRoute: string;
	resourceName: string;
	csvExportLinks?: boolean;
}

export function DataMainLinks(props: DataMainLinksProps) {
	if (props.isPublic) return null;

	return (
		<ul>
			<li><a href={`${props.baseRoute}/edit/new`}>New {props.resourceName}</a></li>
			{props.csvExportLinks && (
				<>
					<li><a href={`${props.baseRoute}/csv-export`}>CSV Export</a></li>
					<li><a href={`${props.baseRoute}/csv-import`}>CSV Import</a></li>
				</>
			)}
		</ul>
	);
}
