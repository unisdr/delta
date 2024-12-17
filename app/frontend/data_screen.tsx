
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
}

export function DataScreen<T>(props: DataScreenProps<T>) {
	const pagination = Pagination(props.paginationData);

	return (
		<MainContainer title={props.plural}>
			<>
				{!props.isPublic &&
					<a href={`${props.baseRoute}/edit/new`}>New {props.resourceName}</a>}
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

