
import {Pagination} from "~/frontend/pagination/view";

export function DataScreen<T>({
	resourceName,
	baseRoute,
	columns,
	items,
	paginationData,
	renderRow,
}: {
	resourceName: string;
	baseRoute: string;
	columns: string[];
	items: T[];
	paginationData: any;
	renderRow: (item: T, baseRoute: string) => React.ReactNode;
}) {
	const pagination = Pagination(paginationData);

	return (
		<div>
			<a href={`${baseRoute}/edit/new`}>New {resourceName}</a>
			{paginationData.totalItems ? (
				<>
					<table className="dts-table">
						<thead>
							<tr>
								{columns.map((col, index) => (
									<th key={index}>{col}</th>
								))}
							</tr>
						</thead>
						<tbody>{items.map((item) => renderRow(item, baseRoute))}</tbody>
					</table>
					{pagination}
				</>
			) : (
				`No data found`
			)}
		</div>
	);
}

