import { Form } from "@remix-run/react";


interface Props {
	search: string;
	clearFiltersUrl: string;
	formStartElement?: React.ReactNode;
}

export function DisasterRecordsFilter(props: Props) {
	return (
		<div className="dts-filter">
			{/* <h3>Filters</h3> */}
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
