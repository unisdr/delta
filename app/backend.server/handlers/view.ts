import { eq } from "drizzle-orm";

import { OffsetLimit } from "~/frontend/pagination/api.server";
import { authLoaderWithPerm, authLoaderApi } from "~/util/auth";
import { executeQueryForPagination3 } from "~/frontend/pagination/api.server";

export async function getItemNumberId(
	params: Record<string, any>,
	q: any,
	table: any
) {
	const id = params["id"];

	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	const res = await q.where(eq(table.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", { status: 404 });
	}

	if (res.length > 1) {
		throw new Response("More than 1 item found", { status: 400 });
	}

	return res[0];
}

export async function getItem2<T>(
	params: Record<string, any>,
	// q: (id: any, countryAccountsId: any) => T,
	q: (id: any) => T,
	// countryAccountsId: string
): Promise<T> {
	const id = params["id"];

	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	// const res = await q(id, countryAccountsId);
	const res = await q(id);

	if (!res) {
		throw new Response("Item not found", { status: 404 });
	}

	return res;
}
export async function getItem1<T>(
	params: Record<string, any>,
	q: (id: any) => T
): Promise<T> {
	const id = params["id"];

	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	const res = await q(id);

	if (!res) {
		throw new Response("Item not found", { status: 404 });
	}

	return res;
}

export function createPaginatedLoader<T>(
	// table: any,
	fetchData: (offsetLimit: OffsetLimit) => Promise<T[]>,
	count: number
) {
	return authLoaderWithPerm("ViewData", async (loaderArgs) => {
		const { request } = loaderArgs;

		// const count = await dr.$count(table);

		const dataFetcher = async (offsetLimit: OffsetLimit) => {
			return await fetchData(offsetLimit);
		};

		const res = await executeQueryForPagination3(
			request,
			count,
			dataFetcher,
			[]
		);

		return { data: res };
	});
}

export function createApiListLoader<T>(
	countTotalItems: () => Promise<number>,
	fetchData: (offsetLimit: OffsetLimit) => Promise<T[]>
) {
	return authLoaderApi(async (loaderArgs) => {
		const { request } = loaderArgs;

		const totalItems = await countTotalItems();
		const dataFetcher = async (offsetLimit: OffsetLimit) => {
			return await fetchData(offsetLimit);
		};

		const res = await executeQueryForPagination3(
			request,
			totalItems,
			dataFetcher,
			[]
		);

		return Response.json({ data: res });
	});
}
