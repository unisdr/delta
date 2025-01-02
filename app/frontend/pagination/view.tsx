import {
	Link
} from "@remix-run/react";

interface PaginationProps {
	itemsOnThisPage: number
	totalItems: number
	page: number
	pageSize: number
	extraParams: Record<string, string[]>
}

export function Pagination(props: PaginationProps) {
	const {
		itemsOnThisPage,
		totalItems,
		page,
		pageSize,
		extraParams,
	} = props

	const totalPages = Math.ceil(totalItems / pageSize)
	const buildQueryString = (newPage: number) => {
		const params = new URLSearchParams({page: newPage.toString()});
		for (const key in extraParams) {
		   extraParams[key].forEach((value) => {
				params.append(key, value);
			});
		}
		return `?${params.toString()}`;
	};
	return (
		<div className="pagination">
			<p>
				Page {page} of {totalPages} | Showing {itemsOnThisPage} of {totalItems} items
			</p>
			<div>
				{page > 1 && (
					<Link to={buildQueryString(page - 1)}>
						<button>Previous</button>
					</Link>
				)}
				{page < totalPages && (
					<Link to={buildQueryString(page + 1)}>
						<button>Next</button>
					</Link>
				)}
			</div>
		</div>
	);
}
