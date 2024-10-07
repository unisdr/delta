import { json, LoaderFunctionArgs } from "@remix-run/node";

import {
		useLoaderData,
		Link
} from "@remix-run/react";

import { prisma } from "~/db.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params;
  if (!id) {
    throw new Response("Missing item ID", { status: 400 });
  }
  const item = await prisma.item.findUnique({
    where: { id: Number(id) },
  });
  if (!item) {
    throw new Response("Item not found", { status: 404 });
  }
  return json({ item });
};


export default function Data() {
	const {item} = useLoaderData<typeof loader>();
	return (
		<div>
			<Link to={`/data/edit/${item.id}`}>Edit</Link>
			<p>ID: {item.id}</p>
			<p>Field1: {item.field1}</p>
			<p>Field2: {item.field2}</p>
 		</div>
	);
}


