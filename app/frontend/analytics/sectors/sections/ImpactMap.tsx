import React, { useState, useEffect } from 'react';
import { ClientOnly } from "remix-utils/client-only";
import type { MapOptions } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useQuery } from 'react-query';

interface ImpactMapProps {
    filters: {
        sectorId: string | null;
        hazardTypeId: string | null;
        specificHazardId: string | null;
        geographicLevelId: string | null;
        fromDate: string | null;
        toDate: string | null;
        disasterEventId: string | null;
        subSectorId: string | null;
    };
    sectorName: string;
}

interface Sector {
    id: number;
    sectorname: string;
    subsectors?: Sector[];
}

const mapConfig: MapOptions = {
    center: [0, 0],
    zoom: 2,
    scrollWheelZoom: true
};

const tileUrls = {
    'Esri_LightGrayCanvas': 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    'CartoDB_Positron': 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
} as const;

// Client-side only map component
const LeafletMap = ({ type }: { type: keyof typeof tileUrls }) => {
    const [MapComponents, setMapComponents] = useState<{
        MapContainer: any;
        TileLayer: any;
    } | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadMap = async () => {
            try {
                const [L, ReactLeaflet, leafletStyles] = await Promise.all([
                    import('leaflet'),
                    import('react-leaflet'),
                    import('leaflet/dist/leaflet.css')
                ]);

                if (!isMounted) return;

                // Fix Leaflet default icon issue
                const DefaultIcon = L.Icon.Default;
                const iconProps = DefaultIcon.prototype as any;
                if (iconProps._getIconUrl) {
                    DefaultIcon.mergeOptions({
                        iconRetinaUrl: markerIcon2x,
                        iconUrl: markerIcon,
                        shadowUrl: markerShadow,
                    });
                }

                setMapComponents({
                    MapContainer: ReactLeaflet.MapContainer,
                    TileLayer: ReactLeaflet.TileLayer
                });
            } catch (error) {
                console.error('Error loading map:', error);
            }
        };

        loadMap();

        return () => {
            isMounted = false;
        };
    }, []);

    if (!MapComponents) {
        return (
            <div
                style={{
                    height: '490px',
                    background: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                Loading map...
            </div>
        );
    }

    const { MapContainer, TileLayer } = MapComponents;

    return (
        <MapContainer {...mapConfig} style={{ height: '490px' }}>
            <TileLayer
                url={tileUrls[type]}
                attribution={type === 'Esri_LightGrayCanvas'
                    ? 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                    : 'Tiles &copy; CartoDB'
                }
                maxZoom={18}
                tileSize={512}
                zoomOffset={-1}
            />
        </MapContainer>
    );
};

const ImpactMap: React.FC<ImpactMapProps> = ({ filters, sectorName }) => {
    const [selectedTab, setSelectedTab] = useState<string>('tab01');
    const targetSectorId = filters.sectorId;

    // Add sectors query
    const { data: sectorsData } = useQuery({
        queryKey: ["sectors"],
        queryFn: async () => {
            const response = await fetch("/api/analytics/sectors");
            if (!response.ok) throw new Error("Failed to fetch sectors");
            return response.json() as Promise<{ sectors: Sector[] }>;
        }
    });

    // Helper function to find sector and its parent
    const findSectorWithParent = (sectors: Sector[], targetId: string): { sector: Sector | undefined; parent: Sector | undefined } => {
        for (const sector of sectors) {
            // Check if this is the main sector
            if (sector.id.toString() === targetId) {
                return { sector, parent: undefined };
            }
            // Check subsectors
            if (sector.subsectors) {
                const subsector = sector.subsectors.find(sub => sub.id.toString() === targetId);
                if (subsector) {
                    return { sector: subsector, parent: sector };
                }
            }
        }
        return { sector: undefined, parent: undefined };
    };

    // Construct title based on sector/subsector selection
    const sectionTitle = () => {
        if (!sectorsData?.sectors) return "Impact by Geographic Level";

        if (filters.sectorId) {
            const { sector, parent } = findSectorWithParent(sectorsData.sectors, filters.sectorId);

            if (filters.subSectorId && sector) {
                // Case: Subsector is selected
                const { sector: subsector, parent: mainSector } = findSectorWithParent(sectorsData.sectors, filters.subSectorId);
                if (subsector && mainSector) {
                    return `Impact in ${subsector.sectorname} (${mainSector.sectorname} Sector) by Geographic Level`;
                }
            }

            // Case: Only sector is selected
            if (sector) {
                return `Impact in ${sector.sectorname} Sector by Geographic Level`;
            }
        }

        return "Impact by Geographic Level";
    };

    const handleSelectTab = (tabId: string) => {
        setSelectedTab(tabId);
    };

    return (
        <section className="dts-page-section">
            <div className="mg-container">
                <h2 className="dts-heading-2">{sectionTitle()}</h2>
                <p className="dts-body-text mb-6">Distribution of impacts across different geographic levels</p>
                <h2 className="mg-u-sr-only" id="tablist01">Tablist title</h2>
                <ul className="dts-tablist" role="tablist" aria-labelledby="tablist01">
                    <li role="presentation">
                        <button
                            className="dts-tablist__button"
                            type="button"
                            role="tab"
                            id="tab01"
                            aria-controls="tabpanel01"
                            aria-selected={selectedTab === 'tab01'}
                            tabIndex={selectedTab === 'tab01' ? 0 : -1}
                            onClick={() => handleSelectTab('tab01')}
                        >
                            <span>Total Damages</span>
                        </button>
                    </li>
                    <li role="presentation">
                        <button
                            className="dts-tablist__button"
                            type="button"
                            role="tab"
                            id="tab02"
                            aria-controls="tabpanel02"
                            aria-selected={selectedTab === 'tab02'}
                            tabIndex={selectedTab === 'tab02' ? 0 : -1}
                            onClick={() => handleSelectTab('tab02')}
                        >
                            <span>Total Losses</span>
                        </button>
                    </li>
                </ul>
                <div id="tabpanel01" role="tabpanel" aria-labelledby="tab01" hidden={selectedTab !== 'tab01'}>
                    <ClientOnly fallback={
                        <div style={{
                            height: '490px',
                            background: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            Loading map...
                        </div>
                    }>
                        {() => <LeafletMap type="Esri_LightGrayCanvas" />}
                    </ClientOnly>
                </div>
                <div id="tabpanel02" role="tabpanel" aria-labelledby="tab02" hidden={selectedTab !== 'tab02'}>
                    <ClientOnly fallback={
                        <div style={{
                            height: '490px',
                            background: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            Loading map...
                        </div>
                    }>
                        {() => <LeafletMap type="CartoDB_Positron" />}
                    </ClientOnly>
                </div>
            </div>
            <style>{`
                .leaflet-container {
                    height: 490px;
                    width: 100%;
                    background: #f5f5f5;
                }
            `}</style>
        </section>
    );
};

export default ImpactMap;
