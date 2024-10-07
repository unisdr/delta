import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import {
  useActionData,
  useNavigation,
} from "@remix-run/react";
import { prisma } from "~/db.server";
import { DataForm } from "~/components/data/form";
import { ValidateFormData } from "~/components/data/model";


export async function action({
  request,
}: ActionFunctionArgs) {
	const res = ValidateFormData(await request.formData());
  if (res.errors) {
    return json(res);
  }
	const item = await prisma.item.create({
    data: res.data
  })
	console.log("Created item", item)
  return redirect(`/data`);
}

export default function New() {
  const actionData = useActionData<typeof action>();
	const data = actionData?.data
	const errors = actionData?.errors
  //const navigation = useNavigation();
//  const isSubmitting =
  //  navigation.formAction === "/data/new";

  return <DataForm edit={false} errors={errors} data={data} />;
}

