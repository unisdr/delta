import { useEffect, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { RECORD_STATUS_OPTIONS } from "../events/hazardevent-filters";
import { Form, useSubmit } from "@remix-run/react";

interface Props {
	clearFiltersUrl: string;
	formStartElement?: React.ReactNode;
	disasterEventName: string;
	disasterRecordUUID: string;
	fromDate: string;
	toDate: string;
	recordStatus: string;
}

interface FilterState {
	disasterEventName: string;
	disasterRecordUUID: string;
	fromDate: string;
	toDate: string;
	recordStatus: string;
}

export function DisasterRecordsFilter(props: Props) {
	const {
		clearFiltersUrl,
		formStartElement,
		disasterEventName,
		disasterRecordUUID,
		fromDate,
		toDate,
		recordStatus,
	} = props;

	const toast = useRef<Toast>(null);
	const submit = useSubmit();

	const [filters, setFilters] = useState<FilterState>({
		disasterEventName,
		disasterRecordUUID,
		fromDate,
		toDate,
		recordStatus,
	});

	// Update state when props change (after loader runs)
	useEffect(() => {
		setFilters({
			disasterEventName,
			disasterRecordUUID,
			fromDate,
			toDate,
			recordStatus,
		});
	}, [disasterEventName, disasterRecordUUID, fromDate, toDate, recordStatus]);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const { fromDate, toDate } = filters;

		if (
			fromDate &&
			toDate &&
			new Date(toDate) < new Date(fromDate)
		) {
			toast.current?.show({
				severity: "error",
				summary: "Invalid Date Range",
				detail: "'To' date cannot be earlier than 'From' date.",
				life: 4000,
			});
			return;
		}

		submit(e.currentTarget, { method: "get" });
	};

	const handleClear = () => {
		const cleared: FilterState = {
			disasterEventName: "",
			disasterRecordUUID: "",
			fromDate: "",
			toDate: "",
			recordStatus: "",
		};
		setFilters(cleared);
		submit(new FormData(), { method: "get", action: clearFiltersUrl });
	};

	return (
		<Form onSubmit={handleSubmit} className="dts-form">
			<Toast ref={toast} />
			{formStartElement}

			<div className="mg-grid mg-grid__col-3">
				{/* Disaster event name */}
				<div className="dts-form-component mg-grid__col--span-2">
					<label>
						<div className="dts-form-component__label">Disaster event name</div>
						<input
							name="disasterEventName"
							type="text"
							placeholder="All disaster events"
							value={filters.disasterEventName}
							onChange={(e) =>
								setFilters({ ...filters, disasterEventName: e.target.value })
							}
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
							value={filters.disasterRecordUUID}
							onChange={(e) =>
								setFilters({ ...filters, disasterRecordUUID: e.target.value })
							}
						/>
					</label>
				</div>

				{/* From date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">From</div>
						<input
							name="fromDate"
							type="date"
							placeholder="Select date"
							value={filters.fromDate}
							onChange={(e) =>
								setFilters({ ...filters, fromDate: e.target.value })
							}
						/>
					</label>
				</div>

				{/* To date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">To</div>
						<input
							name="toDate"
							type="date"
							placeholder="Select date"
							defaultValue={toDate}
							value={filters.toDate}
							onChange={(e) =>
								setFilters({ ...filters, toDate: e.target.value })
							}
						/>
					</label>
				</div>

				<div className="dts-form-component">
					<div className="dts-form-component__label">Record Status</div>
					<label>
						<select
							id="recordStatus"
							name="recordStatus"
							value={filters.recordStatus}
							onChange={(e) =>
								setFilters({ ...filters, recordStatus: e.target.value })
							}
						>
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
				<button
					type="button"
					onClick={handleClear}
					className="mg-button mg-button-outline"
				>
					Clear
				</button>
			</div>
		</Form>
	);
}
