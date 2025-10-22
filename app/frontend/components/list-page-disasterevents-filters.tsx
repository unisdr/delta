import { useRef } from "react";
import { Toast } from "primereact/toast";
import { SelectSector } from "~/drizzle/schema";
import { RECORD_STATUS_OPTIONS } from "../events/hazardevent-filters";
import { Form } from "@remix-run/react";

interface Props {
	disasterEventName?: string;
	recordingInstitution?: string;
	fromDate?: string;
	toDate?: string;
	sectors: SelectSector[];
	clearFiltersUrl: string;
	formStartElement?: React.ReactNode;
	recordStatus?: string;
}

export function DisasterEventsFilter(props: Props) {
	const toast = useRef<Toast>(null);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault(); 

		const formData = new FormData(e.currentTarget);
		const fromDateStr = formData.get("fromDate") as string;
		const toDateStr = formData.get("toDate") as string;

		// Validation
		if (fromDateStr && toDateStr) {
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
							defaultValue={props.disasterEventName}
						/>
					</label>
				</div>

				{/* Recording Institution */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">Recording organization</div>
						<input
							name="recordingInstitution"
							type="text"
							placeholder="Search organization"
							defaultValue={props.recordingInstitution}
						/>
					</label>
				</div>

				{/* From date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">From</div>
						<input name="fromDate" type="date" placeholder="Select date" defaultValue={props.fromDate} />
					</label>
				</div>

				{/* To date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">To</div>
						<input name="toDate" type="date" placeholder="Select date" defaultValue={props.toDate} />
					</label>
				</div>

				<div className="dts-form-component">
					<div className="dts-form-component__label">Record Status</div>
					<label>
						<select id="recordStatus" name="recordStatus">
							<option value="">Select record status</option>
							{RECORD_STATUS_OPTIONS.map((recordStatus) => (
								<option key={recordStatus.value} 
									selected={props.recordStatus === recordStatus.value}
									value={recordStatus.value}>
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
