
import { dr } from "~/db.server";

import {
	count
} from "drizzle-orm";


const defaultPageSize = 100;

export function paginationQueryFromURL(request: Request){
	const url = new URL(request.url);
	const page = parseInt(url.searchParams.get("page") || "1", 10);
	const pageSize = defaultPageSize;
	return {
		viewData: {
			page,
			pageSize,
		},
		query: {
			skip: (page - 1) * pageSize,
			take: pageSize,
		}
	}
}

/*
export async function executeQueryForPaginationPrisma<T, K extends keyof T>(request: Request, prismaObject: any, select: K[], where: any){

	let selectMap = {} as { [key in K]: boolean };

select.forEach((field) => {
 	selectMap[field] = true;
});

	const pagination = paginationQueryFromURL(request);
	const userQuery = {
		select: selectMap,
		where,
		...pagination.query
	}

	const [totalItems, items] = await prisma.$transaction([
		prismaObject.count({
			where: where,
		}),
		prismaObject.findMany(userQuery)
	]);

	const items2: Pick<T,K>[] = items

	return {
		items: items2,
		pagination: {
			totalItems: totalItems as number,
			itemsOnThisPage: items2.length,
			...pagination.viewData,
		}
	}
}

*/

export async function executeQueryForPagination<T>(
	request: Request,
	table: any,
	select: Record<string, any>,
	where: any
) {
	const pagination = paginationQueryFromURL(request);


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

