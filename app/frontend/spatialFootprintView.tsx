import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import SpatialFootprintMapViewer from "~/components/SpatialFootprintMapViewer";

export function SpatialFootprintView({
    initialData = [],
    mapViewerOption = 0,
    mapViewerDataSources = []
  }: {
    initialData: any[];
    mapViewerOption?: any;
    mapViewerDataSources?: any[];
  }) {
    if (initialData) {
        const handlePreviewMap = (e: any) => {
            e.preventDefault();
            previewMap(JSON.stringify((initialData)));
        };

        return (
            <>
                <div>
                    <p>Spatial Footprint:</p>
                    {(() => {
                        try {
                            let footprints: any[] = [];
                            if (initialData) {
                                if (Array.isArray(initialData)) {
                                    footprints = initialData;
                                } else if (typeof initialData === "string") {
                                    try {
                                        const parsed = JSON.parse(initialData);
                                        footprints = Array.isArray(parsed) ? parsed : [];
                                    } catch (error) {
                                        console.error("Invalid JSON in spatialFootprint:", error);
                                        footprints = [];
                                    }
                                } else {
                                    console.warn("Unexpected type for spatialFootprint:", typeof initialData);
                                    footprints = [];
                                }
                            }
                            return (
                                <>
                                    <table style={{borderCollapse: "collapse", width: "100%", border: "1px solid #ddd", marginBottom: "2rem"}}>
                                        <thead>
                                            <tr style={{backgroundColor: "#f4f4f4"}}>
                                                <th style={{border: "1px solid #ddd", padding: "8px", textAlign: "left", fontWeight: "normal"}}>Title</th>
                                                <th style={{border: "1px solid #ddd", padding: "8px", textAlign: "left", fontWeight: "normal"}}>Option</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {footprints.map((footprint: any, index: number) => {
                                                try {
                                                    const option = footprint.map_option || "Unknown Option";
                                                    return (
                                                        <tr key={footprint.id || index}>
                                                            <td style={{border: "1px solid #ddd", padding: "8px"}}>
                                                                <a href="#" onClick={(e) => {e.preventDefault(); const newGeoJson = [{"geojson": footprint.geojson}]; previewMap(JSON.stringify(newGeoJson));}}>
                                                                    {footprint.title}
                                                                </a>
                                                            </td>
                                                            <td style={{border: "1px solid #ddd", padding: "8px"}}>
                                                                <a href="#" onClick={(e) => {e.preventDefault(); const newGeoJson = footprint.geojson; previewGeoJSON(JSON.stringify(newGeoJson));}}>
                                                                    {option}
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    );
                                                } catch {
                                                    return (
                                                        <tr key={index}>
                                                            <td style={{border: "1px solid #ddd", padding: "8px"}}>{footprint.title}</td>
                                                            <td style={{border: "1px solid #ddd", padding: "8px", color: "red"}}>Invalid Data</td>
                                                        </tr>
                                                    );
                                                }
                                            })}
                                        </tbody>
                                    </table>
                                    {mapViewerOption === 1 && <SpatialFootprintMapViewer dataSource={mapViewerDataSources} filterCaption="Spatial Footprint" />}
                                    {mapViewerOption === 0 && (
                                        <button
                                                    onClick={handlePreviewMap}
                                                    style={{
                                                        padding: "10px 16px",
                                                        border: "1px solid #ddd",
                                                        backgroundColor: "#f4f4f4",
                                                        color: "#333",
                                                        fontSize: "14px",
                                                        fontWeight: "normal",
                                                        borderRadius: "4px",
                                                        marginBottom: "2rem",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    Map Preview
                                        </button>
                                    )}
                                </>
                            );

                        } catch (error) {
                            console.error("Error processing spatialFootprint:", error);
                            return <p>Error loading spatialFootprint data.</p>;
                        }
                    })()}
                </div>
            </>
        );
    } else {
        return <></>;
    }
  };