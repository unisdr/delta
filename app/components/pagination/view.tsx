import {
	Link
} from "@remix-run/react";

interface PaginationProps {
	itemsOnThisPage: number
	totalItems: number
	page: number
	pageSize: number
}

export function Pagination(props: PaginationProps) {
	const {
		itemsOnThisPage,
		totalItems,
		page,
		pageSize
	} = props

	const totalPages = Math.ceil(totalItems / pageSize)

	return (
	<div className="pagination">
		<p>
			Page {page} of {totalPages} | Showing {itemsOnThisPage} of {totalItems} items
		</p>
		<div>
			{page > 1 && (
				<Link to={`?page=${page - 1}`}>
					<button>Previous</button>
				</Link>
			)}
			{page < totalPages && (
				<Link to={`?page=${page + 1}`}>
					<button>Next</button>
				</Link>
			)}
		</div>
	</div>
	);
}
