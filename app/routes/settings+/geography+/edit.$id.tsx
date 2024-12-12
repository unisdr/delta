import {
	authActionWithRole,
	authLoaderWithRole
} from "~/util/auth";

import {
	fromForm,
	update
} from "~/backend.server/models/division";

import {divisionTable, DivitionInsert} from "~/drizzle/schema";

import {divisionBreadcrumb, DivisionBreadcrumbRow} from "~/backend.server/models/division";


import {
	useLoaderData,
	useActionData,
} from "@remix-run/react";

import {dr} from "~/db.server";

import {
	eq,
} from "drizzle-orm";
import {DivisionForm} from "~/frontend/division";
import {formStringData} from "~/util/httputil";
import {NavSettings} from "~/routes/settings/nav";

export const loader = authLoaderWithRole("EditData", async (loaderArgs) => {
	const {id} = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", {status: 400});
	}
	const res = await dr.select().from(divisionTable).where(eq(divisionTable.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", {status: 404});
	}

	const item = res[0];

	let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
	if (item.parentId) {
		breadcrumbs = await divisionBreadcrumb(["en"], item.parentId)
	}

	return {
		data: item,
		breadcrumbs: breadcrumbs
	};

});

export const action = authActionWithRole("EditData", async (actionArgs) => {
	const {request, params} = actionArgs;

	const id = Number(params.id);
	if (!id) {
		throw new Response("Missing ID", {status: 400});
	}

	const formData = formStringData(await request.formData());

	const data = fromForm(formData);

	const res = await update(id, data);

	if (!res.ok) {
		return {
			ok: false,
			data: data,
			errors: res.errors,
		};
	}

	return {
		ok: true,
		data: data,
	};
});


export default function Screen() {
	let fields: DivitionInsert
	const loaderData = useLoaderData<typeof loader>();
	fields = loaderData.data;
	let errors = {};
	let changed = false;
	const actionData = useActionData<typeof action>();
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok) {
			throw new Error("TODO: error handling")
			//		errors = actionData.errors;
		} else {
			changed = true;
		}
	}

	const dataForm = DivisionForm({
		edit: true,
		fields: fields,
		errors: errors,
		breadcrumbs: loaderData.breadcrumbs
	})

	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">Geographic levels</h1>
					</div>
				</header>
				<NavSettings />
			</div>
			<section>
				<div className="mg-container">
					{changed ? <p>The data was updated.</p> : null}
					{dataForm}
				</div>
			</section>
		</>
	)
}
