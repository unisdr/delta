import React from "react"
/*
import {
	ComposableMap,
	Geographies,
	Geography,
	ZoomableGroup
} from "react-simple-maps"
*/
export default function Data() {
	return (
		<div>
		<p>Analytics</p>
		<p>TODO</p>
		</div>
	)
}

/*
const geoUrl =
	"https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

export const loader = async () => {
	return null;
};

export default function Data() {
	return (
		<div>
		<p>Analytics</p>
		<p>TODO</p>
		<div className="map">
		<ComposableMap>
			<ZoomableGroup center={[0, 0]} zoom={9}>
			<Geographies geography={geoUrl}>
				{({ geographies }) =>
					geographies.map((geo) => (
						<Geography key={geo.rsmKey} geography={geo} />
					))
				}
			</Geographies>
			</ZoomableGroup>
		</ComposableMap>
		</div>
		</div>
	)
}

*/
