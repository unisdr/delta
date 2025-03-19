import React, { useState, useRef, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config";

import { 
  disasterEventSectorsById,
  disasterEvent_DisasterRecordsCount__ById, 
  disasterEventSectorTotal__ById,
  disasterEventSectorTotal__ByDivisionId,
} from "~/backend.server/models/analytics/disaster-events";

import {
	disasterEventById,
	DisasterEventViewModel,
} from "~/backend.server/models/event";

import {
	getAllChildren,
  getDivisionByLevel,
} from "~/backend.server/models/division";
import { dr } from "~/db.server"; // Drizzle ORM instance
import MapChart from "~/components/MapChart";
import { getAffectedByDisasterEvent } from "~/backend.server/models/analytics/affected-people-by-disaster-event";
import { getAffected } from "~/backend.server/models/analytics/affected-people-by-disaster-event-v2";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Rectangle, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});


// Define an interface for the structure of the JSON objects
interface interfaceMap {
  total: number;
  name: string;
  description: string;
  colorPercentage: number;
  geojson: any;
}


// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {

  const req = loaderArgs.request;
  
  // Parse the request URL
  const parsedUrl = new URL(req.url);

  // Extract query string parameters
  const queryParams = parsedUrl.searchParams;
  const xId = queryParams.get('disasterEventId') || ''; 
  let record:any = undefined;
  let recordsRelatedSectors:any = undefined;
  let countRelatedDisasterRecords:any = undefined;
  let totalSectorEffects:any = undefined;
  let cpDisplayName:string = '';
  let geoData:interfaceMap[] = [];
  let totalAffectedPeople:any = {};
  let totalAffectedPeople2:any = {};

  

  if (xId) {
    record = await disasterEventById(xId).catch(console.error);
    if  ( record ) {
      try {
        cpDisplayName = await contentPickerConfig.selectedDisplay(dr, xId);

        // console.log( xId );
        // console.log( typeof xId );
        // console.log( record );
        // getSectorFullPathById()

        // get all related sectors
        recordsRelatedSectors = await disasterEventSectorsById(xId);
        // get the count of Disaster Records linked to the disaster event
        countRelatedDisasterRecords = await disasterEvent_DisasterRecordsCount__ById(xId);

        totalSectorEffects = await disasterEventSectorTotal__ById(xId);

        //retired, system is now using version 2
        // totalAffectedPeople = await getAffectedByDisasterEvent(dr, xId); 
        totalAffectedPeople2 = await getAffected(dr, xId);
        // console.log( totalAffectedPeople );
        // console.log( totalAffectedPeople, totalAffectedPeople2 );

        const divisionLevel1 = await getDivisionByLevel(1);
        for (const item of divisionLevel1) {
          const totalPerDivision = await disasterEventSectorTotal__ByDivisionId(xId, [item.id]);
          // scores[item.id] = {};
          geoData.push({
            total: totalPerDivision.damages.total,
            name: String(item.name['en']),
            description: 'Total Damage: ' + totalPerDivision.damages.currency + ' ' + totalPerDivision.damages.total,
            colorPercentage: 1,
            geojson: item.geojson,
          });
          // console.log( item );
        }
        // console.log( geoData );
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
    else {
      return json({ }, { status: 404 });
    }
  }

  return ({
    record: record,
    recordsRelatedSectors: recordsRelatedSectors,
    countRelatedDisasterRecords: countRelatedDisasterRecords,
    total: totalSectorEffects,
    cpDisplayName: cpDisplayName,
    geoData: geoData,
    totalAffectedPeople: totalAffectedPeople,
    totalAffectedPeople2: totalAffectedPeople2,
  });
});

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Disaster Events Analysis - DTS" },
    { name: "description", content: "Disaster events analysis page under DTS." },
  ];
};

// React component for Disaster Events Analysis page
function DisasterEventsAnalysisContent() {
  const btnCancelRef = useRef<HTMLButtonElement>(null);
  const btnSubmitRef = useRef<HTMLButtonElement>(null);

  const ld = useLoaderData<{
    record: DisasterEventViewModel | null, 
    recordsRelatedSectors: any,
    countRelatedDisasterRecords: number | null,
    total: any | null,
    cpDisplayName: string,
    geoData: any,
    totalAffectedPeople: any,
    totalAffectedPeople2: any,
  }>();
  let disaggregationsAge2:{
    children:number|undefined, adult: number|undefined, senior: number|undefined
  } | undefined = undefined;

  // // State declarations
  // const [filters, setFilters] = useState<{
  //   disasterEventId: string | null;
  // } | null>(null);

  // // Event handlers for Filters component
  // const handleApplyFilters = (newFilters: typeof filters) => {
  //   setFilters(newFilters);
  // };

    // Define the handleClearFilters function
  const handleClearFilters = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); // Prevent the default form submission
    window.location.href = '/analytics/disaster-events';
  };
  


  useEffect(() => {
      if (ld.record) {
        if (btnCancelRef.current) {
          btnCancelRef.current.disabled = false;
        }
      }
      else {
        if (btnSubmitRef.current) {
          btnSubmitRef.current.disabled = false;
        }
        if (btnCancelRef.current) {
          btnCancelRef.current.disabled = true;
        }
      }
    }, []);

  // console.log(ld.geoData);

  // TODO: apply mapping of data, ask to revise key
  if (ld.record && ld.totalAffectedPeople2.disaggregations.age) {
    console.log( ld.totalAffectedPeople2.disaggregations );
    const ageData = ld.totalAffectedPeople2.disaggregations.age;
    disaggregationsAge2 = {
      children: ageData["0-14"],
      adult: ageData["15-64"], 
      senior: ageData["65+"]
    }
  }

  return (
    <MainContainer title="Disaster Events Analysis" headerExtra={<NavSettings />}>
      <div style={{ maxWidth: "100%", overflow: "hidden" }}>
        <div className="disaster-events-page">

        <section>
          <div className="mg-container">
              <form className="dts-form" method="get">
                  <div className="dts-form__body">
                      <div className="mg-grid mg-grid__col-1">
                          <div className="dts-form-component">
                              <label>
                                  <div className="dts-form-component__label">
                                      <span>Disaster event</span>
                                  </div>
                                  <ContentPicker 
                                    {...contentPickerConfig} 
                                    value={ ld.record ? ld.record.id : '' } 
                                    displayName={ ld.cpDisplayName } 
                                    onSelect={
                                        (item) => {
                                          if (btnCancelRef.current) {
                                            btnCancelRef.current.disabled = false;
                                          }
                                          if (btnSubmitRef.current) {
                                            btnSubmitRef.current.disabled = false;
                                          }
                                        }
                                    }
                                    disabledOnEdit={ld.record ? true : false}
                                  />
                              </label>
                          </div>
                      </div>
                      <div className="dts-form__actions">
                          <button ref={btnSubmitRef} type="submit" className="mg-button mg-button--small mg-button-primary" disabled>Apply filters</button>
                          <button ref={btnCancelRef} onClick={handleClearFilters} type="button" className="mg-button mg-button--small mg-button-outline">Clear</button>
                      </div>
                  </div>
              </form>
          </div>
        </section>

          {/* Conditional rendering: Display this message until filters are applied */}
          {!ld.record && (
            <div
              style={{
                marginTop: "2rem",
                textAlign: "justify",
                padding: "2rem",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
                color: "#333",
                fontSize: "1.6rem",
                lineHeight: "1.8rem",
              }}
            >
              <h3 style={{
                color: "#004f91",
                fontSize: "2rem",
                marginBottom: "1rem",
                textAlign: "center"
              }}>
                Welcome to the Disaster Events Dashboard! 🌟
              </h3>
              <p style={{ textAlign: "center" }}>
                Please select and apply filters above to view the analysis.
              </p>
            </div>
          )}
        </div>

        {ld.record && (<>
        
        <section className="dts-page-section">
        <div className="mg-container">
          <h2 className="dts-heading-2">{ ld.cpDisplayName }</h2>
          <p>Affiliated record(s): { ld.countRelatedDisasterRecords }</p>

          {
            Array.isArray(ld.recordsRelatedSectors) && ld.recordsRelatedSectors.length > 0 && <>
                <p>
                {
                  Array.isArray(ld.recordsRelatedSectors) && ld.recordsRelatedSectors.map((sector, index) => (<>
                      <span key={index}>
                        {sector.sectorname}
                        {ld.recordsRelatedSectors.length == (index + 1) ? ' ' : ', '}
                      </span>
                  </>))
                }
                </p>
            </>
          }

          {
            
            (ld.record && (ld.record.startDate || ld.record.endDate)) && <>
              <p>
                Date: { ld.record.startDate } to {ld.record.endDate}
              </p>
              </>
          }

          {
            (ld.record && ld.record.dataSource) && <>
              <p>
                Data Source: { ld.record.dataSource }
              </p>
            </>   
          }
          
          
          <div className="mg-grid mg-grid__col-3">
            <div className="dts-data-box">
              <h3 className="dts-body-label">
                <span id="elementId03">Damage in { ld.total.damages.currency }</span>
              </h3>
              <div className="dts-indicator dts-indicator--target-box-b">
                <span>{ ld.total.damages.total.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
              </div>
            </div>
            <div className="dts-data-box">
              <h3 className="dts-body-label">
                <span id="elementId04">Losses in { ld.total.losses.currency }</span>
              </h3>
              <div className="dts-indicator dts-indicator--target-box-c">
                <span>{ ld.total.losses.total.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
              </div>
            </div>
            { Number(ld.total.recovery.total) > 0 && (
                <>
                  <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span id="elementId05">Recovery in { ld.total.recovery.currency }</span>
                    </h3>
                    <div className="dts-indicator dts-indicator--target-box-d">
                      <span>{ ld.total.recovery.total.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
                    </div>
                  </div>
                </>
            )}


          </div>
        </div>
      </section>

      { Number(ld.totalAffectedPeople2.noDisaggregations.total) > 0 && (<>
        <section className="dts-page-section">
          <div className="mg-container">
            <h2 className="dts-heading-2">Human direct effects</h2>

            <div className="mg-grid mg-grid__col-3">
              <div className="dts-data-box">
                  <h3 className="dts-body-label">
                    <span>Total people affected</span>
                  </h3>
                  <div className="dts-indicator dts-indicator--target-box-f">
                    <span>{ ld.totalAffectedPeople2.noDisaggregations.total.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
                  </div>
                </div>
            </div>
          </div>
        </section>

        <section className="dts-page-section">
          <div className="mg-container">
            <div className="mg-grid mg-grid__col-3">
              <div className="dts-data-box">
                <h3 className="dts-body-label">
                  <span>Death</span>
                </h3>
                <div className="dts-indicator dts-indicator--target-box-g">
                  <span>{ ld.totalAffectedPeople2.noDisaggregations.tables.deaths.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
                </div>
              </div>
              <div className="dts-data-box">
                <h3 className="dts-body-label">
                  <span>Injured</span>
                </h3>
                <div className="dts-indicator dts-indicator--target-box-g">
                  <span>{ ld.totalAffectedPeople2.noDisaggregations.tables.injured.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
                </div>
              </div>
              <div className="dts-data-box">
                <h3 className="dts-body-label">
                  <span>Missing</span>
                </h3>
                <div className="dts-indicator dts-indicator--target-box-g">
                  <span>{ ld.totalAffectedPeople2.noDisaggregations.tables.missing.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dts-page-section">
          <div className="mg-container">
            <div className="mg-grid mg-grid__col-3">
              <div className="dts-data-box">
                <h3 className="dts-body-label">
                  <span>People directly affected (old DesInventar)</span>
                </h3>
                <div className="dts-indicator dts-indicator--target-box-g">
                  <span>{ ld.totalAffectedPeople2.noDisaggregations.tables.directlyAffected.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
                </div>
              </div>
              <div className="dts-data-box">
                <h3 className="dts-body-label">
                  <span>Displaced</span>
                </h3>
                <div className="dts-indicator dts-indicator--target-box-g">
                  <span>{ ld.totalAffectedPeople2.noDisaggregations.tables.displaced.toLocaleString(navigator.language, { minimumFractionDigits: 0 }) }</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dts-page-section">
          <div className="mg-container">
            <div className="mg-grid mg-grid__col-3">
              { (
                  (ld.totalAffectedPeople2.disaggregations.sex)
                  && (
                    ld.totalAffectedPeople2.disaggregations.sex.m
                    ||
                    ld.totalAffectedPeople2.disaggregations.sex.f
                    ||
                    ld.totalAffectedPeople2.disaggregations.sex.o
                  )

                ) && ( 
                <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Men and women affected</span>
                    </h3>
                    <div className="dts-indicator" style={{height: '300px'}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            width={500}
                            height={300}
                            data={
                              [
                                { 
                                  name: '',
                                  'Men': ld.totalAffectedPeople2.disaggregations.sex.m,
                                  'Women': ld.totalAffectedPeople2.disaggregations.sex.f,
                                  'Other non-Binary': ld.totalAffectedPeople2.disaggregations.sex.o,
                                }
                              ]
                            }
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip wrapperStyle={{ fontSize:'17px' }} />
                            <Legend align="left" wrapperStyle={{ fontSize:'14px', paddingTop:'10px' }} />
                            <Bar dataKey="Men" fill="#58508d" />
                            <Bar dataKey="Women" fill="#bc5090" />
                            <Bar dataKey="Other non-Binary" fill="#879e82" />
                          </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
              )}

              { (
                  (ld.totalAffectedPeople2.disaggregations.disability && ld.totalAffectedPeople2.disaggregations.disability.disability)
                  || 
                  (ld.totalAffectedPeople2.disaggregations.globalPovertyLine && ld.totalAffectedPeople2.disaggregations.globalPovertyLine.below)
                  || 
                  (ld.totalAffectedPeople2.disaggregations.nationalPovertyLine && ld.totalAffectedPeople2.disaggregations.nationalPovertyLine.below)
                ) && ( 
                <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Persons with disabilities and living in poverty affected</span>
                    </h3>
                    <div className="dts-placeholder" style={{height: '330px'}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            width={500}
                            height={300}
                            data={
                              [{
                                name: '',
                                'Persons with disabilities': ld.totalAffectedPeople2.disaggregations.disability.disability,
                                'Persons living in poverty (national)': ld.totalAffectedPeople2.disaggregations.nationalPovertyLine.below,
                                'Persons living in poverty (international)': ld.totalAffectedPeople2.disaggregations.globalPovertyLine.below,
                              }]
                            }
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip wrapperStyle={{ fontSize:'17px' }} />
                            <Legend align="left" wrapperStyle={{ fontSize:'14px', paddingTop:'10px' }} />
                            <Bar dataKey="Persons with disabilities" fill="#00202e" />
                            <Bar dataKey="Persons living in poverty (national)" fill="#003f5c" />
                            <Bar dataKey="Persons living in poverty (international)" fill="#2c4875" />
                          </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
              )}


              { (ld.totalAffectedPeople2.disaggregations.age) 
                && (disaggregationsAge2 && disaggregationsAge2.children ) 
                && ( 
                <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Children, adults, and seniors affected</span>
                    </h3>
                    <div className="dts-placeholder" style={{height: '300px'}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            width={500}
                            height={300}
                            data={
                              [
                                { 
                                  name: '',
                                  'Children': disaggregationsAge2?.children,
                                  'Adults': disaggregationsAge2?.adult,
                                  'Seniors': disaggregationsAge2?.senior,
                                }
                              ]
                            }
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip wrapperStyle={{ fontSize:'17px' }} />
                            <Legend align="left" wrapperStyle={{ fontSize:'14px', paddingTop:'10px' }} />
                            <Bar dataKey="Children" fill="#58508d" />
                            <Bar dataKey="Adults" fill="#bc5090" />
                            <Bar dataKey="Seniors" fill="#879e82" />
                          </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
              )}
            </div>
          </div>
        </section>



      </>)}




        { Number(ld.total.damages.total) > 0 && (
          <>
            <section className="dts-page-section">
              <div className="mg-container">
                <h2 className="dts-heading-2">Affected areas/zones</h2>

                


                <ul className="dts-tablist" role="tablist" aria-labelledby="tablist01">
                  <li role="presentation">
                    <button type="button" className="dts-tablist__button" role="tab" id="tab01" aria-selected="true" aria-controls="tabpanel01">
                      <span>Total Damage</span>
                    </button>
                  </li>
                  <li role="presentation">
                    <button type="button" className="dts-tablist__button" role="tab" id="tab02" aria-controls="tabpanel02" aria-selected="false" disabled>
                      <span>Total Affected</span>
                    </button>
                  </li>
                  <li role="presentation">
                    <button type="button" className="dts-tablist__button" role="tab" id="tab03" aria-controls="tabpanel03" aria-selected="false" disabled>
                      <span>Total Losses</span>
                    </button>
                  </li>
                </ul>
                <div className="dts-tablist__panel" id="tabpanel01" role="tabpanel" aria-labelledby="tab01">
                  <div>
                      <MapChart id="map_viewer" dataSource={ld.geoData} legendMaxColor="#208f04" />
                  </div>
                </div>
                <div className="dts-tablist__panel hidden" id="tabpanel02" role="tabpanel" aria-labelledby="tab02">
                  <div className="dts-placeholder">
                    <span>Placeholder map 2</span>
                  </div>
                </div>
                <div className="dts-tablist__panel hidden" id="tabpanel03" role="tabpanel" aria-labelledby="tab03">
                  <div className="dts-placeholder">
                    <span>Placeholder map 3</span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      

      </>)}

      </div>
      
    </MainContainer>
  );
}

// Wrapper component that provides QueryClient
export default function DisasterEventsAnalysis() {
  return (
    <QueryClientProvider client={queryClient}>
      <DisasterEventsAnalysisContent />
    </QueryClientProvider>
  );
}
