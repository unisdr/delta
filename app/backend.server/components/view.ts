import {
	eq,
} from "drizzle-orm";


export async function getItemNumberId(
	params: Record<string, any>,
	q: any,
	table: any
) {
	const id = params["id"];

	if (!id) {
		throw new Response("Missing item ID", {status: 400});
	}

	const res = await q.where(eq(table.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", {status: 404});
	}

	if (res.length > 1) {
		throw new Response("More than 1 item found", {status: 400});
	}

	return res[0];
}

export async function getItem2<T>(
	params: Record<string, any>,
	q: (id: any) => T,
): Promise<T> {
	const id = params["id"];

	if (!id) {
		throw new Response("Missing item ID", {status: 400});
	}

	const res = await q(id);

	if (!res) {
		throw new Response("Item not found", {status: 404});
	}

	return res;
}
