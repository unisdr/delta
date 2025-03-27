import {
	Link
} from "@remix-run/react";

import {useEffect, useState, useRef, ReactElement} from 'react';

import {DisasterEventFields, DisasterEventViewModel, HazardousEventBasicInfoViewModel, DisasterEventBasicInfoViewModel} from "~/backend.server/models/event"

import {hazardousEventLink} from "~/frontend/events/hazardeventform"

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
	FieldErrors,
	Field,
	WrapInputBasic,
	WrapInput
} from "~/frontend/form";
import {approvalStatusField} from "../approval";
import {formatDate} from "~/util/date";
import AuditLogHistory from "~/components/AuditLogHistory";
import {HazardPicker, Hip} from "~/frontend/hip/hazardpicker";
import {HipHazardInfo} from "~/frontend/hip/hip";
import {capitalizeFirstLetter} from "~/util/string";

import {UserForFrontend} from "~/util/auth";

import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { SpatialFootprintView } from '~/frontend/spatialFootprintView';
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";

export const route = "/disaster-event"

function repeatOtherIds(n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		res.push(
			{key: "otherId" + (i + 1), label: `Event ID in other system (${i + 1})`, type: "text", uiRow: i == 0 ? {} : undefined, repeatable: {"group": "otherId", index: i}},
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatEarlyActions(n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		res.push(
			{
				key: `earlyActionDescription` + (i + 1),
				label: "Description",
				type: "textarea",
				uiRow: {
					label: `Early Action (${i + 1})`,
				},
				repeatable: {"group": "earlyAction", "index": i}
			},
			{
				key: `earlyActionDate` + (i + 1),
				label: "Date",
				type: "date",
				repeatable: {"group": "earlyAction", "index": i}
			}
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatDisasterDeclarations(n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		let j = i + 1
		res.push(
			{
				key: "disasterDeclarationTypeAndEffect" + j,
				label: `Type and Effect`,
				type: "textarea",
				uiRow: {
					label: `Disaster declaration (${j})`
				},
				repeatable: {"group": "disasterDeclaration", "index": i}
			},
			{
				key: "disasterDeclarationDate" + j,
				label: `Date`,
				type: "date",
				repeatable: {"group": "disasterDeclaration", "index": i}
			},
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatRapidOrPreliminaryAssesments(n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {

		let j = i + 1

		res.push(
			{
				key: "rapidOrPreliminaryAssessmentDescription" + j,
				label: `Description`,
				type: "textarea",
				uiRow: {
					label: `Rapid/Preliminary assessment (${j})`
				},
				repeatable: {"group": "rapidOrPreliminaryAssessment", "index": i}
			},
			{
				key: "rapidOrPreliminaryAssessmentDate" + j,
				label: `Date`,
				type: "date",
				repeatable: {"group": "rapidOrPreliminaryAssessment", "index": i}
			},
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatPostDisasterAssesments(n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		let j = i + 1
		res.push(
			{
				key: "postDisasterAssessmentDescription" + j,
				label: `Description`,
				type: "textarea",
				uiRow: {
					label: `Post-disaster assessment (${j})`
				},
				repeatable: {"group": "postDisasterAssessment", "index": i}
			},
			{
				key: "postDisasterAssessmentDate" + j,
				label: `Date`,
				type: "date",
				repeatable: {"group": "postDisasterAssessment", "index": i}
			},
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatOtherAssesments(n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		let j = i + 1
		res.push(
			{
				key: "otherAssessmentDescription" + j,
				label: `Description`,
				type: "textarea",
				uiRow: {
					label: `Other assessment (${j})`
				},
				repeatable: {"group": "otherAssessment", "index": i}
			},
			{
				key: "otherAssessmentDate" + j,
				label: `Date`,
				type: "date",
				repeatable: {"group": "otherAssessment", "index": i}
			},
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}


export const fieldsDefCommon = [
	approvalStatusField,
	{key: "nationalDisasterId", label: "National Disaster ID", type: "text", uiRow: {}},

	...repeatOtherIds(3),

	{key: "nameNational", label: "National name", desc: "Disaster name ( if any) ( if applicable)- national", type: "text", uiRow: {}},
	{key: "glide", label: "GLIDE Number", type: "text", uiRow: {}},
	{key: "nameGlobalOrRegional", label: "Global/Regional Name", desc: "Disaster event name in global or regional databases - name ( if applicable)", type: "text"},
	{key: "startDate", label: "Start Date", type: "date_optional_precision", uiRow: {}},
	{key: "endDate", label: "End Date", type: "date_optional_precision"},
	{key: "startDateLocal", label: "Start Date in local format ", type: "text", uiRow: {}},
	{key: "endDateLocal", label: "End Date in local format", type: "text"},
	{key: "durationDays", label: "Duration (Days)", desc: "Duration (of event direct effects) - in days", type: "number", uiRow: {}},
	{
		key: "disasterDeclaration", label: "Disaster Declaration", type: "enum", required: true, enumData: [
			{key: "unknown", label: "Unknown"},
			{key: "yes", label: "Yes"},
			{key: "no", label: "No"}
		],
		uiRow: {label: "Disaster Declaration"}
	},
	...repeatDisasterDeclarations(5),

	{key: "hadOfficialWarningOrWeatherAdvisory", label: "Was there an officially issued warning and/or weather advisory?", type: "bool", uiRow: {label: "Official Warning"}},
	{key: "officialWarningAffectedAreas", label: "Which affected areas were covered by the warning?", type: "textarea"},

	...repeatEarlyActions(5),
	...repeatRapidOrPreliminaryAssesments(5),
	{key: "responseOperations", label: "Response Operations", type: "textarea", uiRow: {}},
	...repeatPostDisasterAssesments(5),
	...repeatOtherAssesments(5),

	{key: "dataSource", label: "Data Source", type: "text", uiRow: {label: "Data source"}},
	{key: "recordingInstitution", label: "Recording institution", type: "text"},
	{key: "effectsTotalUsd", label: "Effects ( damages+ losses) total ( in monetary terms - USD", type: "money", uiRow: {label: "Effects"}},
	{key: "nonEconomicLosses", label: "Non-Economic losses", type: "textarea", uiRow: {}},
	{key: "damagesSubtotalLocalCurrency", label: "Damages ( sub-total) -in monetary terms - local currency", type: "money", uiRow: {}},
	{key: "lossesSubtotalUSD", label: "Losses ( sub-total) -  in monetary terms - USD", type: "money", uiRow: {}},
	{key: "responseOperationsDescription", label: "(Emergency) Response operations (description)", type: "textarea", uiRow: {}},
	{key: "responseOperationsCostsLocalCurrency", label: "Response operations costs ( total expenditure, in local currency)", type: "money", uiRow: {}},
	{key: "responseCostTotalLocalCurrency", label: "(Emergency) Response cost - total - in local currency", type: "money", uiRow: {}},
	{key: "responseCostTotalUSD", label: "(Emergency) Response cost - total - in USD", type: "money"},
	{key: "humanitarianNeedsDescription", label: "Humanitarian needs - description", type: "textarea", uiRow: {}},

	{key: "humanitarianNeedsLocalCurrency", label: "Humanitarian needs - total in local currency", type: "money", uiRow: {}},
	{key: "humanitarianNeedsUSD", label: "Humanitarian needs - total in USD", type: "money"},

	{key: "rehabilitationCostsLocalCurrencyOverride", label: "Rehabilitation costs - total in local currency", type: "money", uiRow: {}},
	//{key: "rehabilitationCostsUSD", label: "Rehabilitation costs - total in USD", type: "money"},
	{key: "repairCostsLocalCurrencyOverride", label: "Repair costs - total in local currency", type: "money", uiRow: {}},
	//{key: "repairCostsUSD", label: "Repair costs - total in USD", type: "money"},
	{key: "replacementCostsLocalCurrencyOverride", label: "Replacement costs - total in local currency", type: "money", uiRow: {}},
	//{key: "replacementCostsUSD", label: "Replacement costs - total in USD", type: "money"},
	{key: "recoveryNeedsLocalCurrencyOverride", label: "Recovery needs - total in local currency", type: "money", uiRow: {}},
	//{key: "recoveryNeedsUSD", label: "Recovery needs - total in USD", type: "money"},
	{key: "legacyData", label: "Legacy Data", type: "json", uiRow: {colOverride: 1}},
	{key: "attachments", label: "Attachments", type: "other", psqlType: "jsonb", uiRowNew: true},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "other", psqlType: "jsonb"},
] as const;

export const fieldsDef: FormInputDef<DisasterEventFields>[] = [
	{key: "hazardousEventId", label: "", type: "uuid"},
	{key: "disasterEventId", label: "", type: "uuid"},
	{key: "hipHazardId", label: "Hazard", type: "other", uiRow: {colOverride: 1}},
	{key: "hipClusterId", label: "", type: "other"},
	{key: "hipTypeId", label: "", type: "other"},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<DisasterEventFields>[] = [
	{key: "hazardousEventId", label: "", type: "uuid"},
	{key: "disasterEventId", label: "", type: "uuid"},
	{key: "hipHazardId", label: "", type: "other"},
	{key: "hipClusterId", label: "", type: "other"},
	{key: "hipTypeId", label: "", type: "other"},
	...fieldsDefCommon,
	{key: "apiImportId", label: "", type: "other"},
];

export const fieldsDefView: FormInputDef<DisasterEventViewModel>[] = [
	{key: "hazardousEventId", label: "", type: "uuid"},
	{key: "disasterEventId", label: "", type: "uuid"},
	{key: "hipHazard", label: "", type: "other"},
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

export function disasterEventLabel(args: {
	id?: string;
}): string {
	let parts: string[] = []
	if (args.id) {
		parts.push(args.id.slice(0, 5))
	}
	return parts.join(" ")
}

export function disasterEventLink(args: {
	id: string;
}) {
	return <Link to={`/disaster-event/${args.id}`}>
		{disasterEventLabel(args)}
	</Link>
}

interface DisasterEventFormProps extends UserFormProps<DisasterEventFields> {
	divisionGeoJSON?: any;
	hip: Hip;
	hazardousEvent?: HazardousEventBasicInfoViewModel | null
	disasterEvent?: DisasterEventBasicInfoViewModel | null
	treeData: any[];
	ctryIso3: string;
}

export function DisasterEventForm(props: DisasterEventFormProps) {
	const fields = props.fields;

	const [selectedHazardousEvent, setSelectedHazardousEvent] = useState(props.hazardousEvent);

	const [selectedDisasterEvent, setSelectedDisasterEvent] = useState(props.disasterEvent);
	useEffect(() => {
		const handleMessage = (event: any) => {
			console.log("got message from another window", event.data)
			if (event.data?.type == "select_hazard") {
				if (event.data?.selected) {
					setSelectedHazardousEvent(event.data.selected);
				}
			}
			if (event.data?.type == "select_disaster") {
				if (event.data?.selected) {
					setSelectedDisasterEvent(event.data.selected);
				}
			}
		};
		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;

	const dialogTreeViewRef = useRef<any>(null);
	const treeViewRef = useRef<any>(null);
	const contentReapeaterRef = useRef<any>(null);
	const treeViewDiscard = (e?: any) => {
		if (e) e.preventDefault();
		dialogTreeViewRef.current?.close();
		treeViewRef.current.treeViewClear();
	}
	const treeViewOpen = (e: any) => {
		e.preventDefault();
		dialogTreeViewRef.current?.showModal();

		let contHeight = [] as number[];
		contHeight[0] = (dialogTreeViewRef.current.querySelector(".dts-dialog__content") as HTMLElement | null)?.offsetHeight || 0;
		contHeight[1] = (dialogTreeViewRef.current.querySelector(".dts-dialog__header") as HTMLElement | null)?.offsetHeight || 0;
		contHeight[2] = (dialogTreeViewRef.current.querySelector(".tree-filters") as HTMLElement | null)?.offsetHeight || 0;
		contHeight[3] = (dialogTreeViewRef.current.querySelector(".tree-footer") as HTMLElement | null)?.offsetHeight || 0;
		let getHeight = contHeight[0] - contHeight[1] - contHeight[2] - 100;

		const dtsFormBody = dialogTreeViewRef.current.querySelector(".dts-form__body") as HTMLElement | null;
		if (dtsFormBody) {
			dtsFormBody.style.height = `${getHeight - (window.innerHeight - getHeight)}px`;
		}
	}

	let hazardousEventLinkInitial: "none" | "hazardous_event" | "disaster_event" = "none"
	if (props.fields.hazardousEventId) {
		hazardousEventLinkInitial = "hazardous_event"
	} else if (props.fields.disasterEventId) {
		hazardousEventLinkInitial = "disaster_event"
	}

	const [hazardousEventLinkType, setHazardousEventLinkType] = useState(hazardousEventLinkInitial)

	let calculationOverrides: Record<string, ReactElement | undefined | null> = {}

	let names = ["rehabilitation", "repair", "replacement", "recovery"]
	let initialOverrides: Record<string, boolean> = {}
	for (let name of names) {
		let mod = name != "recovery" ? "Costs" : "Needs"
		let nameOverride = name + mod + "LocalCurrencyOverride"
		let valueOverride = (props.fields as any)[nameOverride] as string
		initialOverrides[nameOverride] = typeof valueOverride == "string" && valueOverride != ""
	}

	let [overrides, setOverrides] = useState(initialOverrides)
	for (let name of names) {
		let mod = name != "recovery" ? "Costs" : "Needs"
		let nameOverride = name + mod + "LocalCurrencyOverride"
		let nameCalc = name + mod + "LocalCurrencyCalc"
		let valueOverride = (props.fields as any)[nameOverride] as string
		let valueCalc = (props.fields as any)[nameCalc] as string
		//	let value = (valueOverride !== "" && valueOverride !== null) ? valueOverride : valueCalc
		//if (value === "" || value === null) {
		//value = "0"
		//}
		let def = fieldsDef.find((d) => d.key == nameOverride)
		if (!def) throw new Error("def not found for: " + nameOverride)

		let errors: any = null
		if (props.errors?.fields) {
			let fe = props.errors.fields as any
			errors = fe[nameOverride]
		}

		const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
			setOverrides((prevOverrides) => ({...prevOverrides, [nameOverride]: event.target.checked}));
		}

		calculationOverrides[nameOverride] = (
			<>
				<WrapInput
					def={def}
					child={
						<>
							{overrides[nameOverride] ? (
								<input
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									name={nameOverride}
									defaultValue={valueOverride}
								/>
							) : (
								<>
									<input type="hidden" name={nameOverride} value="" />
									<input type="text" disabled value={valueCalc} />
								</>
							)}
						</>
					}
					errors={errors}
				/>
				<WrapInputBasic label="Override" child={
					<input type="checkbox" checked={overrides[nameOverride] || false} onChange={handleCheckboxChange}></input>
				} />
			</>
		)
	}

	return (
		<FormView
			user={props.user}
			path={route}
			edit={props.edit}
			id={props.id}
			plural="disaster events"
			singular="disaster event"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			infoNodes={<>
				<div className="mg-grid mg-grid__col-3">
					<WrapInputBasic label="Linking parameter" child={
						<select defaultValue={hazardousEventLinkType} onChange={(e: any) => setHazardousEventLinkType(e.target.value)}>
							<option value="none">No link</option>
							<option value="hazardous_event">Hazardous event</option>
							<option value="disaster_event">Disaster event</option>
						</select>
					} />
				</div>
			</>
			}
			override={{
				...calculationOverrides,
				hazardousEventId:
					(hazardousEventLinkType == "hazardous_event") ?
						<Field key="hazardousEventId" label="Hazardous Event">
							{selectedHazardousEvent ? hazardousEventLink(selectedHazardousEvent) : "-"}&nbsp;
							<Link target="_blank" rel="opener" to={"/hazardous-event/picker"}>Change</Link>
							<input type="hidden" name="hazardousEventId" value={selectedHazardousEvent?.id || ""} />
							<FieldErrors errors={props.errors} field="hazardousEventId"></FieldErrors>
						</Field> : <input type="hidden" name="hazardousEventId" value="" />
				,
				disasterEventId:
					(hazardousEventLinkType == "disaster_event") ?
						<Field key="disasterEventId" label="Disaster Event">
							{selectedDisasterEvent ? disasterEventLink(selectedDisasterEvent) : "-"}&nbsp;
							<Link target="_blank" rel="opener" to={"/disaster-event/picker"}>Change</Link>
							<input type="hidden" name="disasterEventId" value={selectedDisasterEvent?.id || ""} />
							<FieldErrors errors={props.errors} field="disasterEventId"></FieldErrors>
						</Field> : <input type="hidden" name="disasterEventId" value="" />
				,
				hipTypeId: null,
				hipClusterId: null,
				hipHazardId: (
					<Field key="hazardId" label="Hazard classification">
						<HazardPicker hip={props.hip} typeId={fields.hipTypeId} clusterId={fields.hipClusterId} hazardId={fields.hipHazardId} />
						<FieldErrors errors={props.errors} field="hipHazardId"></FieldErrors>
					</Field>
				),
				spatialFootprint: props.edit ? (
					<Field key="spatialFootprint" label="">
						<SpatialFootprintFormView
							divisions={divisionGeoJSON}
							ctryIso3={ctryIso3 || ""}
							treeData={treeData ?? []}
							initialData={props.fields?.spatialFootprint}
						/>
					</Field>
				) : (
					<Field key="spatialFootprint" label=""><></></Field>
				),
				attachments: props.edit ? (
					<Field key="attachments" label="">
						<AttachmentsFormView
							save_path_temp="/uploads/temp"
							file_viewer_temp_url="/disaster-event/file-temp-viewer"
							file_viewer_url="/disaster-event/file-viewer"
							api_upload_url="/disaster-event/file-pre-upload"
							initialData={props?.fields?.attachments}
						/>
					</Field>
				) : (
					<Field key="attachments" label=""><></></Field>
				),
			}} />
	)
}

interface DisasterEventViewProps {
	item: DisasterEventViewModel;
	isPublic: boolean;
	auditLogs?: any[];
	user: UserForFrontend
}

export function DisasterEventView(props: DisasterEventViewProps) {

	console.log("Disaster even tview got user", props.user)
	const {item, auditLogs} = props;

	let calculationOverrides: Record<string, ReactElement | undefined | null> = {}

	let names = ["rehabilitation", "repair", "replacement", "recovery"]
	for (let name of names) {
		let mod = name != "recovery" ? "Costs" : "Needs"
		let nameOverride = name + mod + "LocalCurrencyOverride"
		let nameCalc = name + mod + "LocalCurrencyCalc"
		let valueOverride = (props.item as any)[nameOverride] as string
		let valueCalc = (props.item as any)[nameCalc] as string
		let value = (valueOverride !== "" && valueOverride !== null) ? valueOverride : valueCalc
		if (value === "" || value === null) {
			value = "0"
		}
		calculationOverrides[nameOverride] = (
			<p key={nameOverride}>{capitalizeFirstLetter(name)} {mod} Local Currency: {value}</p>
		)
	}

	let override = {
		...calculationOverrides,
		hazardousEventId: (
			item.hazardousEvent &&
			<p key="hazardousEventId">Hazardous Event: {hazardousEventLink(item.hazardousEvent)}</p>
		),
		disasterEventId: (
			item.disasterEvent &&
			<p key="disasterEventId">Disaster Event: {disasterEventLink(item.disasterEvent)}</p>
		),
		hipHazard: (
			<HipHazardInfo key="hazard" model={item} />
		),
		createdAt: (
			<p key="createdAt">Created at: {formatDate(item.createdAt)}</p>
		),
		updatedAt: (
			<p key="updatedAt">Updated at: {formatDate(item.updatedAt)}</p>
		),
		spatialFootprint: (
			<SpatialFootprintView
				initialData={item?.spatialFootprint || []}
				mapViewerOption={0}
				mapViewerDataSources={[]}
			/>
		),
		attachments: (
			<AttachmentsView
				id={item.id}
				initialData={item?.attachments || []}
				file_viewer_url="/disaster-event/file-viewer"
			/>
		),
	}

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Disaster events"
			singular="Disaster event"
		>
			<FieldsView def={fieldsDefView} fields={item} override={override} user={props.user} />

			{/* Add Audit Log History at the end */}
			<br />
			{
				auditLogs && auditLogs.length > 0 && (
					<>
						<h3>Audit Log History</h3>
						<AuditLogHistory auditLogs={auditLogs} />
					</>
				)
			}
		</ViewComponent >
	);
}




