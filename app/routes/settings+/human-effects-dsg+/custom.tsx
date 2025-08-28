import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/util/auth";

import { dr } from '~/db.server';

import { MainContainer } from "~/frontend/container";

import { humanDsgConfigTable } from "~/drizzle/schema";

import {
	SubmitButton,
} from "~/frontend/form";
import { useActionData, useLoaderData } from "@remix-run/react";

import { Form } from "@remix-run/react";
import { HumanEffectsCustomConfig } from "~/frontend/human_effects/defs";
import { Editor } from "~/frontend/human_effects/custom_editor";

import { useEffect, useState } from 'react'
import { notifyError, notifyInfo } from "~/frontend/utils/notifications";

async function getConfig() {
	const row = await dr.query.humanDsgConfigTable.findFirst()
	return { config: row?.custom || null }
}

let langs = ["en", "ar", "zh", "fr", "ru", "es"]

export const loader = authLoaderWithPerm("EditHumanEffectsCustomDsg", async () => {
	return await getConfig()
});

export const action = authActionWithPerm("EditHumanEffectsCustomDsg", async ({ request }) => {
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
			return { ok: false, error: String(e) }
		}
	}

	if (configData && Array.isArray(configData.config)) {
		for (const def of configData.config) {
			if (!Array.isArray(def.enum) || def.enum.length < 2) {
				return {
					ok: false,
					error: `Disaggregation "${def.dbName}" must have at least 2 options.`
				}
			}
		}
	}

	await dr.transaction(async (tx) => {
		const row = await tx.query.humanDsgConfigTable.findFirst()
		if (!row) {
			await tx.insert(humanDsgConfigTable)
				.values({ custom: configData })
		} else {
			await tx.update(humanDsgConfigTable)
				.set({ custom: configData })
		}
	})

	return { ok: true }
})

export default function Screen() {

	const ld = useLoaderData<typeof loader>();
	const ad = useActionData<typeof action>();

	const [config, setConfig] = useState<HumanEffectsCustomConfig>(() =>
		ld.config
			? ld.config
			: { version: 1, config: [] }
	);

	useEffect(() => {
		if (ad)
			if (!ad.ok) {
				notifyError(ad.error || "Server error")
			} else {
				notifyInfo("Your changes have been saved")
			}
	}, [ad]);

	return (
		<MainContainer title="Human Effects Custom Disaggregations">
			<Form method="post">

				<h2>Your configuration</h2>

				<input
					type="hidden"
					name="config"
					value={JSON.stringify(config)}
				/>

				<Editor
					langs={langs}
					value={config.config}
					onChange={(config) =>
						setConfig((prev) => ({ ...prev, config }))
					}
				/>

				<SubmitButton
					className="mg-button mg-button-primary"
					label="Update config"
				/>

			</Form>

		</MainContainer>
	);
}
