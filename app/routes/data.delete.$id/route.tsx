import {
	LoaderFunctionArgs,
	redirect,
} from "@remix-run/node";

import { prisma } from "~/db.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params;
  if (!id) {
    throw new Response("Missing item ID", { status: 400 });
  }
	const item = await prisma.item.delete({
		where: {
			id: Number(id), 
		},
  })
	console.log("Delete item", item)
  return redirect(`/data`);
};


