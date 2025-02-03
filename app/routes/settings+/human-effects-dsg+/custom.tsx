import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/util/auth";

import {dr} from '~/db.server';

import {MainContainer} from "~/frontend/container";

import {humanDsgConfigTable} from "~/drizzle/schema";

import {
	SubmitButton,
} from "~/frontend/form";
import {useActionData, useLoaderData} from "@remix-run/react";

import {Form} from "@remix-run/react";
import {HumanEffectsCustomConfig} from "~/frontend/human_effects/defs";

async function getConfig() {
	const row = await dr.query.humanDsgConfigTable.findFirst()
	return {config: row?.custom || null}
}

export const loader = authLoaderWithPerm("EditHumanEffectsCustomDsg", async () => {
	return await getConfig()
});

export const action = authActionWithPerm("EditHumanEffectsCustomDsg", async ({request}) => {
	let formData = await request.formData()
	let config = formData.get("config") || ""
	if (typeof config !== "string") {
		throw "Wrong argument"
	}
	let configData: HumanEffectsCustomConfig | null = null
	if (config) {
		try {
			configData = JSON.parse(config)
		} catch (e) {
			return {ok: false, error: String(e)}
		}
	}

	await dr.transaction(async (tx) => {
		const row = await tx.query.humanDsgConfigTable.findFirst()
		if (!row) {
			await tx.insert(humanDsgConfigTable)
				.values({custom: configData})
		} else {
			await tx.update(humanDsgConfigTable)
				.set({custom: configData})
		}

	})

	return {ok: true}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	let configObj = ld.config

	let error = ""
	const ad = useActionData<typeof action>();
	if (ad) {
		if (!ad.ok) {
			error = ad.error || "Server error"
		}
	}

	let configText = ""
	if (configObj) {
		configText = JSON.stringify(configObj, null, 2)
	}
	return (
		<MainContainer
			title="Human Effects Custom Disaggregations"
		>
			<Form method="post">
				<h3>Your configuration</h3>
				{error}
				<textarea name="config" style={{height: "300px", width: "500px"}} defaultValue={configText}></textarea>
				<SubmitButton className="mg-button mg-button-primary" label="Update config" />
			</Form>
			<br />
			<h3>Example configuration (JSON):</h3>
			<pre>
				{`
{
"version": "1",
"config": [
{
	"uiName": "Custom indicator",
	"dbName": "custom_indicator",
	"uiColWidth": 60,
	"enum": [
		{"key": "group1", "label": "Group 1"},
		{"key": "group2", "label": "Group 2"}
	]
}
]
}
`}
			</pre>
		</MainContainer>
	)
}
