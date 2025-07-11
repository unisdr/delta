import { useLoaderData } from "@remix-run/react";
import { dr } from "~/db.server";
import { sql, } from "drizzle-orm";
import SpatialFootprintsMapViewer from "~/components/SpatialFootprintsMapViewer";

export const loader = async () => {
    const disasterEvents = await dr.execute(sql`
      SELECT 
        de.id,
        de.spatial_footprint AS event_spatial_footprint,
        de.name_global_or_regional,
        de.name_national,
        jsonb_agg(
          jsonb_build_object(
            'id', dr.id,
            'spatial_footprint', (
              SELECT jsonb_agg(
                CASE 
                  WHEN sf -> 'geojson' -> 'properties' ? 'division_id' THEN
                    jsonb_set(
                      sf,
                      '{geojson,geometry}',
                      '{}'::jsonb,
                      true
                    )
                  ELSE
                    sf
                END
              )
              FROM jsonb_array_elements(dr.spatial_footprint) AS sf
            ),
            'damages', COALESCE(damages.items, '[]'::jsonb),
            'losses', COALESCE(losses.items, '[]'::jsonb),
            'disruption', COALESCE(disruption.items, '[]'::jsonb)
          )
        ) AS disaster_records
      FROM disaster_event de
      LEFT JOIN disaster_records dr ON dr.disaster_event_id = de.id
  
      -- Damages
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id,
          'spatial_footprint', d.spatial_footprint
        )) AS items
        FROM damages d
        WHERE d.record_id = dr.id
      ) damages ON true
  
      -- Losses
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'id', l.id,
          'spatial_footprint', l.spatial_footprint
        )) AS items
        FROM losses l
        WHERE l.record_id = dr.id
      ) losses ON true
  
      -- Disruption
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'id', di.id,
          'spatial_footprint', di.spatial_footprint
        )) AS items
        FROM disruption di
        WHERE di.record_id = dr.id
      ) disruption ON true
  
      WHERE de.id = '21e1f65b-0f9c-4c0d-8a0c-f10947ef6a8b'
  
      GROUP BY 
        de.id, 
        de.spatial_footprint, 
        de.name_global_or_regional, 
        de.name_national;
    `);

    console.log(disasterEvents.rows);
  
    return { disasterEvents: disasterEvents.rows };
  };


export default function SpatialFootprintsDrMap() {
     const { disasterEvents } = useLoaderData() as any;

     console.log(disasterEvents);

    return (
        <>
                <div className="dts-page-header">
                    <header className="dts-page-title">
                        <div className="mg-container">
                            <h1 className="dts-heading-1">Example</h1>
                        </div>
                    </header>
                </div>
                <section>
                    <div className="mg-container">
                        <form>
                            <div className="fields">
                                <div className="form-field">
                                    <SpatialFootprintsMapViewer filterCaption="Spatial Footprint" dataSource={disasterEvents} ctryIso3="YEM" />
                                </div>
                            </div>
                        </form>
                    </div>
                </section>
        </>
    )
}