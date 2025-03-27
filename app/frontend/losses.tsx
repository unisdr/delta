import {
	Field,
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
	Input,
	errorsToStrings,
} from "~/frontend/form"

import {useEffect, useRef, useState} from "react"

import {LossesFields, LossesViewModel} from "~/backend.server/models/losses"
import {UnitPicker} from "./unit_picker"

export const route = "/disaster-record/edit-sub/_/losses"

import * as totaloverrides from "~/frontend/components/totaloverrides"
import {typeEnumAgriculture, typeEnumNotAgriculture} from "./losses_enums";

import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { SpatialFootprintView } from '~/frontend/spatialFootprintView';
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/losses`
}

interface LossesFormProps extends UserFormProps<LossesFields> {
	ctryIso3?: string;
	treeData?: any;
	fieldDef: FormInputDef<LossesFields>[]
	divisionGeoJSON?: any[]
}

export function LossesForm(props: LossesFormProps) {
	let formRef = useRef<HTMLFormElement>(null)

	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;

	// handle total overrides
	useEffect(() => {
		if (!formRef.current) return

		totaloverrides.formOnSubmitAllowDisabled(formRef)

		let prefixes = [
			"public",
			"private",
		]
		let opts = (pref: string): totaloverrides.handleOverridesOpts => {
			return {
				formRef,
				prefix: pref,
				partsNames: ["CostUnit", "Units"],
				resName: "CostTotal",
				calc: (parts) => parts[0] * parts[1],
			}
		}
		for (let pref of prefixes) {
			totaloverrides.attach(opts(pref))
		}
		return () => {
			if (formRef.current) {
				for (let pref of prefixes) {
					totaloverrides.detach(opts(pref))
				}
			}
		}
	}, [props.fields])



	// select dropdown to show based if sector is related to agriculture
	let extra = props.fields.sectorIsAgriculture ? {
		typeNotAgriculture: null,
		relatedToNotAgriculture: null
	} : {
		typeAgriculture: null,
		relatedToAgriculture: null
	}

	let typeDef = (key: string) => props.fieldDef.find(d => d.key == key)!
	let [type, setType] = useState({
		agriculture: props.fields.typeAgriculture || "",
		//agriculture: props.fields.typeAgriculture || typeDef("typeAgriculture").enumData![0].key,
		notAgriculture: props.fields.typeNotAgriculture || "",
		//notAgriculture: props.fields.typeNotAgriculture || typeDef("typeNotAgriculture").enumData![0].key,
	})

	let renderTypeInput = (suffix: "agriculture" | "notAgriculture") => {
		let key = `type${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`
		let value = type[suffix]
		let def = typeDef(key)
		let f = props.errors?.fields as any
		let e: any = []
		if (f) {
			e = errorsToStrings(f[key])
		}
		return <Input
			def={def}
			name={key}
			value={value}
			enumData={[
				{key: "", label: "Select"},
				...def.enumData!
			]}
			errors={e}
			onChange={(e: any) => {
				setType({...type, [suffix]: e.target.value})
				return
			}}
		/>
	}

	const renderRelatedToInput = (suffix: "agriculture" | "notAgriculture") => {
		let key = `relatedTo${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`
		let def = typeDef(key)
		let filterValue = suffix === "notAgriculture" ? type.notAgriculture : type.agriculture
		let enumData = suffix === "notAgriculture" ? typeEnumNotAgriculture : typeEnumAgriculture
		let f = props.errors?.fields as any
		let e: any = []
		if (f) {
			e = errorsToStrings(f[key])
		}

		return <Input
			def={def}
			name={key}
			value={(props.fields as any)[key]}
			enumData={[
				{key: "", label: filterValue === "" ? "Select type first" : "Select"},
				...enumData.filter(v => v.type == filterValue)
			]}
			disabled={filterValue === ""}
			errors={e}
		/>
	}


	let override = {
		sectorIsAgriculture: (
			<input key="sectorIsAgriculture" name="sectorIsAgriculture" type="hidden" value={props.fields.sectorIsAgriculture ? "on" : "off"} />
		),
		typeNotAgriculture: renderTypeInput("notAgriculture"),
		relatedToNotAgriculture: renderRelatedToInput("notAgriculture"),
		typeAgriculture: renderTypeInput("agriculture"),
		relatedToAgriculture: renderRelatedToInput("agriculture"),
		recordId: (
			<input key="recordId" name="recordId" type="hidden" value={props.fields.recordId} />
		),
		sectorId: (
			<input key="sectorId" name="sectorId" type="hidden" value={props.fields.sectorId} />
		),
		publicUnit: <UnitPicker name="publicUnit" defaultValue={props.fields.publicUnit || undefined} />,
		privateUnit: <UnitPicker name="privateUnit" defaultValue={props.fields.privateUnit || undefined} />,

		...extra,
		spatialFootprint: (
			<Field key="spatialFootprint" label="">
				<SpatialFootprintFormView
					divisions={divisionGeoJSON}
					ctryIso3={ctryIso3 || ""}
					treeData={treeData ?? []}
					initialData={props?.fields?.spatialFootprint}
					geographicLevel={false}
				/>
			</Field>
		),
		attachments: (
			<Field key="attachments" label="">
				<AttachmentsFormView
					save_path_temp="/uploads/temp"
					file_viewer_temp_url="/disaster-record/file-temp-viewer"
					file_viewer_url="/disaster-record/file-viewer?loc=losses"
					api_upload_url="/disaster-record/file-pre-upload"
					initialData={props?.fields?.attachments}
				/>
			</Field>
		)
	}

	return (
		<FormView
			formRef={formRef}
			path={route}
			listUrl={route2(props.fields.recordId!) + "?sectorId=" + props.fields.sectorId}
			edit={props.edit}
			id={props.id}
			plural="Losses"
			singular="Losses"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			elementsAfter={{
				description: (
					<h2>Public</h2>
				),
				publicCostTotalOverride: (
					<h2>Private</h2>
				),
			}}
			override={override}
		/>
	)
}

interface LossesViewProps {
	item: LossesViewModel
	fieldDef: FormInputDef<LossesFields>[]
}

export function LossesView(props: LossesViewProps) {

	// Select field to show depending on if sector is related to agriculture or not.
	let extra = props.item.sectorIsAgriculture ? {
		typeNotAgriculture: null,
		relatedToNotAgriculture: null
	} : {
		typeAgriculture: null,
		relatedToAgriculture: null
	}

	let override = {
		sectorIsAgriculture: null,
		recordId: (
			<p key="recordId">Disaster record ID: {props.item.recordId}</p>
		),
		sectorId: (
			<p key="sectorId">Sector ID: {props.item.sectorId}</p>
		),
		...extra,
		spatialFootprint: (
			<SpatialFootprintView
				initialData={(props?.item?.spatialFootprint as any[]) || []}
				mapViewerOption={0}
				mapViewerDataSources={[]}
			/>
		),
		attachments: (
			<AttachmentsView
				id={props.item.id}
				initialData={(props?.item?.attachments as any[]) || []}
				file_viewer_url="/disaster-record/file-viewer"
				location="losses"
			/>
		),
	}

	return (
		<ViewComponent
			path={route}
			listUrl={route2(props.item.recordId!) + "?sectorId=" + props.item.sectorId}
			id={props.item.id}
			plural="Losses"
			singular="Losses"
		>
			<FieldsView
				def={props.fieldDef}
				fields={props.item}
				override={override}
				elementsAfter={{
					description: (
						<h2>Public</h2>
					),
					publicCostTotalOverride: (
						<h2>Private</h2>
					),
				}}
			/>
		</ViewComponent>
	)
}

