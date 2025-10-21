import { useRef } from "react";
import { Toast } from "primereact/toast";
import { SelectSector } from "~/drizzle/schema";
import { RECORD_STATUS_OPTIONS } from "../events/hazardevent-filters";
import { Form } from "@remix-run/react";

interface Props {
	sectors: SelectSector[];
	clearFiltersUrl: string;
	formStartElement?: React.ReactNode;
}

export function DisasterRecordsFilter(props: Props) {
	const toast = useRef<Toast>(null);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault(); 

		console.log("handleSubmit");
		const formData = new FormData(e.currentTarget);
		const fromDateStr = formData.get("fromDate") as string;
		const toDateStr = formData.get("toDate") as string;

		// Validation
		if (fromDateStr && !toDateStr) {
			toast.current?.show({
				severity: "error",
				summary: "Invalid Date Range",
				detail: "Please select a 'To' date when 'From' date is set.",
				life: 4000,
			});
			return;
		} else if (!fromDateStr && toDateStr) {
			toast.current?.show({
				severity: "error",
				summary: "Invalid Date Range",
				detail: "Please select a 'From' date when 'To' date is set.",
				life: 4000,
			});
			return;
		} else if (fromDateStr && toDateStr) {
			const fromDate = new Date(fromDateStr);
			const toDate = new Date(toDateStr);

			if (toDate < fromDate) {
				toast.current?.show({
					severity: "error",
					summary: "Invalid Date Range",
					detail: "'To' date cannot be earlier than 'From' date.",
					life: 4000,
				});
				return;
			}
		}

		e.currentTarget.submit();
	};

	return (
		<Form onSubmit={handleSubmit} className="dts-form">
			<Toast ref={toast} />
			{props.formStartElement}

			<div className="mg-grid mg-grid__col-3">
				{/* Disaster event name */}
				<div className="dts-form-component mg-grid__col--span-2">
					<label>
						<div className="dts-form-component__label">Disaster event name</div>
						<input
							name="disasterEventName"
							type="text"
							placeholder="All disaster events"
						/>
					</label>
				</div>

				{/* Disaster record */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">Disaster record</div>
						<input
							name="disasterRecordUUID"
							type="text"
							placeholder="Search for UUID"
						/>
					</label>
				</div>

				{/* From date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">From</div>
						<input name="fromDate" type="date" placeholder="Select date" />
					</label>
				</div>

				{/* To date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">To</div>
						<input name="toDate" type="date" placeholder="Select date" />
					</label>
				</div>

				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
							Recording Organization
						</div>
						<input
							name="recordingOrganization"
							type="text"
							placeholder="Search organization"
							disabled
						/>
					</label>
				</div>

				{/* Sector dropdowns, etc. */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">Sector</div>
						<select id="sector" name="sector" disabled>
							<option value="">Select sector</option>
							{props.sectors.map((sector) => (
								<option key={sector.id} value={sector.id}>
									{sector.sectorname}
								</option>
							))}
						</select>
					</label>
				</div>
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">Sub sector</div>
						<select
							id="sub_sector"
							name="subSector"
							// value={subSector || ""}
							disabled
						>
							<option value="">Select sub sector</option>
							{/* {subSectors.map((subSector) => (
								<option key={subSector.id} value={subSector.id}>
								{subSector.name}
								</option>
								))} */}
						</select>
					</label>
				</div>

				<div className="dts-form-component">
					<div className="dts-form-component__label">Record Status</div>
					<label>
						<select id="recordStatus" name="recordStatus">
							<option value="">Select record status</option>
							{RECORD_STATUS_OPTIONS.map((recordStatus) => (
								<option key={recordStatus.value} value={recordStatus.value}>
									{recordStatus.label}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>

			{/* Buttons */}
			<div className="dts-form__actions">
				<input
					type="submit"
					value="Apply filters"
					className="mg-button mg-button-primary"
				/>
				<a href={props.clearFiltersUrl} className="mg-button mg-button-outline">
					Clear
				</a>
			</div>
		</Form>
	);
}
