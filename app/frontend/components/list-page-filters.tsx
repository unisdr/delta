import {
	Form,
} from "@remix-run/react";

import {Field} from "~/frontend/form"

interface FiltersProps {
	search: string,
	clearFiltersUrl: string
	formStartElement?: React.ReactNode; 
}

export function Filters(props: FiltersProps) {
	return <div className="dts-filter">
		<h3>Filters</h3>
		<Form className="dts-form">
			{props.formStartElement}
			<div className="dts-form-component">
				<Field label="Search">
					<input
						name="search"
						type="text"
						defaultValue={props.search}
					/>
				</Field>
			</div>
			<div className="dts-form__actions">
				<input
					type="submit"
					value="Apply"
					className="mg-button mg-button-primary"
				/>
				<a href={props.clearFiltersUrl} className="mg-button mg-button-outline">
					Clear filters
				</a>
			</div>
		</Form>
	</div>
}

