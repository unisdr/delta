import {
	json,
	LoaderFunctionArgs,
	ActionFunctionArgs,
	redirect,
} from "@remix-run/node";

import {
		useLoaderData,
		useActionData
} from "@remix-run/react";


import { DataForm } from "~/components/data/form";
import { Data, ValidateFormData } from "~/components/data/model";


import { prisma } from "~/db.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params;
  if (!id) {
    throw new Response("Missing item ID", { status: 400 });
  }
  const data = await prisma.item.findUnique({
    where: { id: Number(id) },
  });
  if (!data) {
    throw new Response("Item not found", { status: 404 });
  }
  return json({ data });
};


export async function action({
  request,
	params
}: ActionFunctionArgs) {
  const { id } = params;
  if (!id) {
    throw new Response("Missing item ID", { status: 400 });
  }
	const res = ValidateFormData(await request.formData());
  if (res.errors) {
    return json(res);
  }
	const item = await prisma["item"].update({
		where: {
			id: Number(id), 
		},
		data: res.data
  })
	console.log("Updated item", item)
  return redirect(`/data`);
}

export default function Edit() {
	let data: Data
  const loaderData = useLoaderData<typeof loader>();
	data = loaderData.data
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors
	if (actionData) {
		data = actionData.data
	}
  //const navigation = useNavigation();
	//  const isSubmitting =
  //  navigation.formAction === "/data/new";

  return <DataForm edit={true} errors={errors} data={data} />;
}


