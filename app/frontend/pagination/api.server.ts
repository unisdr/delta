import { dr } from "~/db.server";

import {
	count,
} from "drizzle-orm";

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

export function paginationQueryFromURL(request: Request, extraParams: string[]) {
	const url = new URL(request.url);
	const page = parseInt(url.searchParams.get("page") || "1", 10);
	let pageSize = parseInt(url.searchParams.get("pageSize") || DEFAULT_PAGE_SIZE.toString(), 10);

	const isPageSizeValid = PAGE_SIZE_OPTIONS.includes(pageSize);

	if (!isPageSizeValid) {
		pageSize = 10;
	}

	const params: Record<string, string[]> = {};
	console.log("extraParams = ", extraParams)
	for (const param of extraParams) {
		const values = url.searchParams.getAll(param);
		console.log(param, " = ", values)
		if (values.length > 0) {
			params[param] = values;
		}
	}
	return {
		viewData: {
			page,
			pageSize,
			extraParams: params,
		},
		query: {
			skip: (page - 1) * pageSize,
			take: pageSize,
		}
	}
}


// Interface for pagination parameters
interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

// Function to extract and validate pagination parameters
export function getPaginationParams(request: Request, defaultPageSize: number = 10, maxPageSize: number = 100): PaginationParams {
  const url = new URL(request.url);
  
  // Extract pagination parameters
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  let pageSize = parseInt(url.searchParams.get("pageSize") || defaultPageSize.toString(), 10);

  // Validate pagination values
  const pageNumber = Math.max(1, isNaN(page) ? 1 : page);
  pageSize = Math.max(1, Math.min(maxPageSize, isNaN(pageSize) ? defaultPageSize : pageSize));
  const offset = (pageNumber - 1) * pageSize;

  return { page: pageNumber, pageSize, offset };
}

export async function executeQueryForPagination<T>(
	request: Request,
	table: any,
	select: Record<string, any>,
	where: any,
) {
	const pagination = paginationQueryFromURL(request, []);


	const totalItemsRes = await dr.select({ count: count() }).from(table).where(where);
	const totalItems = totalItemsRes[0].count;

	const items = await dr
		.select(select)
		.from(table)
		.where(where)
		.offset(pagination.query.skip)
		.limit(pagination.query.take);
	return {
		items: items as [T],
		pagination: {
			totalItems,
			itemsOnThisPage: items.length,
			...pagination.viewData,
		},
	};
}

export async function executeQueryForPagination2<T>(
	request: Request,
	q: any,
	q2: (query: any) => any,
	extraParams: string[]
) {

	const pagination = paginationQueryFromURL(request, extraParams);

	const countQ = dr.select({ count: count() });
	const totalItemsRes: any = await q2(countQ);
	const totalItems = Number(totalItemsRes[0]?.count);

	const items = await q2(q)
		.offset(pagination.query.skip)
		.limit(pagination.query.take)
		.execute();

	return {
		items: items as T[],
		pagination: {
			totalItems,
			itemsOnThisPage: Number(items.length),
			...pagination.viewData,
		},
	};
}

export interface OffsetLimit {
	offset: number
	limit: number
}

export async function executeQueryForPagination3<T>(
	request: Request,
	totalItems: number,
	q: (pagination: OffsetLimit) => Promise<T[]>,
	extraParams: string[]
) {

	const pagination = paginationQueryFromURL(request, extraParams);
	console.log("pagination= ", pagination)

	const items = await q({ offset: pagination.query.skip, limit: pagination.query.take })

	return {
		items: items,
		pagination: {
			totalItems,
			itemsOnThisPage: Number(items.length),
			...pagination.viewData,
		},
	};
}
