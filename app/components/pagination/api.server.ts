import { prisma } from "~/db.server";
import { Prisma } from "@prisma/client";

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

export async function executeQueryForPagination<T, K extends keyof T>(request: Request, prismaObject: any, select: K[], where: any){

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
