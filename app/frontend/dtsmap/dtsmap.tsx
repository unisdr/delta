import React, {useEffect, useRef} from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import {OSM} from "ol/source";
import {fromLonLat} from "ol/proj";

import {Circle, Fill, Stroke, Style} from 'ol/style.js';

type DTSMapProps = {
	geoData: any;
};

export default function DTSMap({geoData}: DTSMapProps) {
	const mapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mapRef.current) return;

		//const projection = "EPSG:4326" // for globe maps
		const projection = "EPSG:3857" // flat projection

		const vectorSource = new VectorSource({
			features: new GeoJSON().readFeatures(geoData, {
				featureProjection: projection,
			}),
		});

		const style = new Style({
			stroke: new Stroke({color: "black", width: 1}),
			fill: new Fill({color: "rgba(150,150,150, 0.9)"}),
		});

		const vectorLayer = new VectorLayer({
			source: vectorSource,
			style: style,
		});

		const map = new Map({
			target: mapRef.current,
			layers: [
				new TileLayer({ source: new OSM()}),
				vectorLayer,
			],
			view: new View({
				projection: projection,
				center: fromLonLat([0, 0]),
				zoom: 1,
			}),
		});

		if (geoData.bbox) {
			const bbox = geoData.bbox;
			const extent = [
				...fromLonLat([bbox[0], bbox[1]]),
				...fromLonLat([bbox[2], bbox[3]]),
			];
			map.getView().fit(extent, {size: map.getSize()});
		}

		return () => map.setTarget(undefined);
	}, [geoData]);

	return <div className="dts-ol-map" ref={mapRef} style={{width: "100%", height: "400px"}} />;
}

