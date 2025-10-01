import { Form } from "@remix-run/react";

interface Props {
	search: string;
	clearFiltersUrl: string;
	formStartElement?: React.ReactNode;
}

export function DisasterRecordsFilter(props: Props) {
	return (
		<div className="dts-filter">
			<Form className="dts-form">
				{props.formStartElement}
				<div className="mg-grid mg-grid__col-3">
					<div className="dts-form-component mg-grid__col--span-2">
						<label>
							<div className="dts-form-component__label">
								Disaster event UUID
							</div>
							<input
								name="disasterEventUUID"
								type="text"
								defaultValue={props.search}
								placeholder="All disaster events UUID"
							/>
						</label>
					</div>
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">Disaster record</div>
							<input
								name="disasterRecordUUID"
								type="text"
								defaultValue={props.search}
								placeholder="Search for UUID"
							/>
						</label>
					</div>
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">From</div>
							<input
								name="fromDate"
								type="date"
								defaultValue={props.search}
								placeholder="Select date"
							/>
						</label>
					</div>
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">To</div>
							<input
								name="toDate"
								type="date"
								defaultValue={props.search}
								placeholder="Select date"
							/>
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
								defaultValue={props.search}
								placeholder="Search organization"
								disabled
							/>
						</label>
					</div>
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">Sector</div>
							<select
								id="sector"
								name="sector"
								// value={sector || ""}
								disabled
							>
								<option value="">Select sector</option>
								{/* {sectors.map((sector) => (
								<option key={sector.id} value={sector.id}>
									{sector.name}
								</option>
							))} */}
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
							<select
								id="recordStatus"
								name="recordStatus"
								// value={recordStatus || ""}
								disabled
							>
								<option value="">Record status</option>
								{/* {recordStatues.map((recordStatus) => (
								<option key={recordStatus.id} value={recordStatus.id}>
								{recordStatus.name}
								</option>
								))} */}
							</select>
						</label>
					</div>
				</div>
				<div className="dts-form__actions">
					<input
						type="submit"
						value="Apply filters"
						className="mg-button mg-button-primary"
					/>
					<a
						href={props.clearFiltersUrl}
						className="mg-button mg-button-outline"
					>
						Clear
					</a>
				</div>
			</Form>
		</div>
	);
}
