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
	getSectorAncestorById,
} from "~/backend.server/models/sector";


import {
	getAllChildren,
  getDivisionByLevel,
} from "~/backend.server/models/division";
import { dr } from "~/db.server"; // Drizzle ORM instance
import MapChart, { MapChartRef } from "~/components/MapChart";
import { getAffectedByDisasterEvent } from "~/backend.server/models/analytics/affected-people-by-disaster-event";
import { getAffected } from "~/backend.server/models/analytics/affected-people-by-disaster-event-v2";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Rectangle, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PieChart, Pie, Sector, Cell } from 'recharts';
import CustomPieChart from '~/components/PieChart';

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

interface interfaceChart {
  name: string;
  value: number;
}

interface interfaceSector {
  id: number;
  sectorname: string;
  level: number;
  ids: [];
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
  let sectorDamagePieChartData:interfaceChart[] = [];
  let sectorLossesPieChartData:interfaceChart[] = [];
  let sectorRecoveryPieChartData:interfaceChart[] = [];
  let datamageGeoData:interfaceMap[] = [];
  let lossesGeoData:interfaceMap[] = [];
  let humanEffectsGeoData:interfaceMap[] = [];
  let totalAffectedPeople:any = {};
  let totalAffectedPeople2:any = {};
  let sectorBarChart:any = {};

  // Initialize arrays to store filtered values
let sectorParentArray: interfaceSector[] = [];
let x: any = {};
let sectorIdsArray: number[] = [];


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
        recordsRelatedSectors = await disasterEventSectorsById(xId, true);
        for (const item of recordsRelatedSectors) {
          // console.log( item.relatedAncestorsDecentants );
          // const sectorParentArray = (item.relatedAncestorsDecentants as interfaceSector[]).filter(item2 => item2.level === 2);
          // const sectorIdsArray = (item.relatedAncestorsDecentants as interfaceSector[]).map(item2 => item2.id);

          if (item.relatedAncestorsDecentants) {
            // Filter for level 2 and save to sectorParentArray
            const filteredAncestors = (item.relatedAncestorsDecentants as interfaceSector[]).filter(
              ancestor => ancestor.level === 2
            );
            x = filteredAncestors[0];
            //sectorParentArray.push(...filteredAncestors);

            x.myChildren = [];
            // console.log(x.myChildren);

            // Map IDs and save to sectorIdsArray
            const ancestorIds = (item.relatedAncestorsDecentants as interfaceSector[]).map(ancestor => ancestor.id);
            // sectorIdsArray.push(...ancestorIds);
            // console.log('ancestorIds', ancestorIds );
            x.myChildren = ancestorIds;
            x.effects = {};
            x.effects = await disasterEventSectorTotal__ById(xId, ancestorIds);
            sectorParentArray.push(x.effects);
            if (x.effects.damages.total > 0) {
              sectorDamagePieChartData.push({name: x.sectorname, value: x.effects.damages.total});
            }
            if (x.effects.losses.total > 0) {
              sectorLossesPieChartData.push({name: x.sectorname, value: x.effects.losses.total});
            }
            if (x.effects.recovery.total > 0) {
              sectorRecoveryPieChartData.push({name: x.sectorname, value: x.effects.recovery.total});
            }
            
            // console.log('x:', x);
          }
        }

        // console.log('Sector Parent Array:', sectorParentArray);
        // console.log('sectorDamagePieChartData Array:', sectorDamagePieChartData);
        // console.log('Sector IDs Array:', sectorIdsArray);

        //console.log( recordsRelatedSectors[0].sectorParent[0].id );
        // console.log( mapSectorArray );
        // console.log( sectorBarChart );
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
          const humanEffectsPerDivision = await getAffected(dr, xId, {divisionId: item.id});
          
          humanEffectsGeoData.push({
            total: humanEffectsPerDivision.noDisaggregations.total,
            name: String(item.name['en']),
            description: 'Total People Affected: ' + humanEffectsPerDivision.noDisaggregations.total.toLocaleString(navigator.language, { minimumFractionDigits: 0 }),
            colorPercentage: 1,
            geojson: item.geojson,
          });

          // scores[item.id] = {};
          lossesGeoData.push({
            total: totalPerDivision.losses.total,
            name: String(item.name['en']),
            description: 'Total Losses: ' + totalPerDivision.losses.currency + ' ' + totalPerDivision.losses.total.toLocaleString(navigator.language, { minimumFractionDigits: 0 }),
            colorPercentage: 1,
            geojson: item.geojson,
          });

          datamageGeoData.push({
            total: totalPerDivision.damages.total,
            name: String(item.name['en']),
            description: 'Total Damage: ' + totalPerDivision.damages.currency + ' ' + totalPerDivision.damages.total.toLocaleString(navigator.language, { minimumFractionDigits: 0 }),
            colorPercentage: 1,
            geojson: item.geojson,
          });
          // console.log( item );
        }
        // console.log( datamageGeoData );
        // console.log( lossesGeoData );
        // console.log( humanEffectsGeoData );
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
    datamageGeoData: datamageGeoData,
    lossesGeoData: lossesGeoData,
    humanEffectsGeoData: humanEffectsGeoData,
    totalAffectedPeople: totalAffectedPeople,
    totalAffectedPeople2: totalAffectedPeople2,
    sectorDamagePieChartData: sectorDamagePieChartData,
    sectorLossesPieChartData: sectorLossesPieChartData,
    sectorRecoveryPieChartData: sectorRecoveryPieChartData,
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
  const mapChartRef = useRef<MapChartRef>(null); //  Reference to MapChart

  const ld = useLoaderData<{
    record: DisasterEventViewModel | null, 
    recordsRelatedSectors: any,
    countRelatedDisasterRecords: number | null,
    total: any | null,
    cpDisplayName: string,
    datamageGeoData: any,
    lossesGeoData: any,
    humanEffectsGeoData: any,
    totalAffectedPeople: any,
    totalAffectedPeople2: any,
    sectorDamagePieChartData: interfaceChart[],
    sectorLossesPieChartData: interfaceChart[],
    sectorRecoveryPieChartData: interfaceChart[],
  }>();
  let disaggregationsAge2:{
    children:number|undefined, adult: number|undefined, senior: number|undefined
  } | undefined = undefined;

  let [activeData, setActiveData] = useState(ld.datamageGeoData); //  Default MapChart geoData

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

  const handleSwitchMapData = (e: React.MouseEvent<HTMLButtonElement>, data: any, legendMaxColor: string) => {
    if (!e || !e.currentTarget) {
      console.error("Event is undefined or does not have a target.");
      return;
    }

    e.preventDefault();

    document.getElementById('tab01')?.setAttribute('aria-selected', 'false');
    document.getElementById('tab02')?.setAttribute('aria-selected', 'false');
    document.getElementById('tab03')?.setAttribute('aria-selected', 'false')
  
    const buttonText = e.currentTarget.textContent?.trim() || "Legend";
  
    // console.log('data:', data);
    // console.log('buttonText:', buttonText);
    // console.log();
    e.currentTarget.ariaSelected = 'true';
  
    setActiveData(data);
    mapChartRef.current?.setDataSource(data);
    mapChartRef.current?.setLegendTitle(buttonText);
    mapChartRef.current?.setLegendMaxColor(legendMaxColor);
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

  // console.log(ld.datamageGeoData);

  // TODO: apply mapping of data, ask to revise key
  if (ld.record && ld.totalAffectedPeople2.disaggregations.age) {
    // console.log( ld.totalAffectedPeople2.disaggregations );
    const ageData = ld.totalAffectedPeople2.disaggregations.age;
    disaggregationsAge2 = {
      children: ageData["0-14"],
      adult: ageData["15-64"], 
      senior: ageData["65+"]
    }
  }

  const data1 = [
    { name: 'Group A', value: 400 },
    { name: 'Group B', value: 300 },
    { name: 'Group C', value: 300 },
    { name: 'Group D', value: 200 },
  ];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
            <h2 className="dts-heading-2">Human effects</h2>

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
                            <XAxis type="category" dataKey="name" />
                            <Legend align="left" wrapperStyle={{ fontSize:'14px' }} />
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
                            <XAxis type="category" dataKey="name" />
                            <Legend align="left" wrapperStyle={{ fontSize:'14px' }} />
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
                            // layout="vertical"
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
                            <XAxis type="category" dataKey="name" />
                            {/* <YAxis type="number" /> */}
                            <Legend align="left" wrapperStyle={{ fontSize:'14px' }} />
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
                    <button onClick={(e) => handleSwitchMapData(e, ld.datamageGeoData, '#208f04')} type="button" className="dts-tablist__button" role="tab" id="tab01" aria-selected="true" aria-controls="tabpanel01">
                      <span>Total Damage</span>
                    </button>
                  </li>
                  <li role="presentation">
                    <button onClick={(e) => handleSwitchMapData(e, ld.humanEffectsGeoData, '#ff1010')}  type="button" className="dts-tablist__button" role="tab" id="tab02" aria-controls="tabpanel02" aria-selected="false">
                      <span>Total Affected</span>
                    </button>
                  </li>
                  <li role="presentation">
                    <button onClick={(e) => handleSwitchMapData(e, ld.lossesGeoData, '#58508d')} type="button" className="dts-tablist__button" role="tab" id="tab03" aria-controls="tabpanel03" aria-selected="false">
                      <span>Total Losses</span>
                    </button>
                  </li>
                </ul>
                <div className="dts-tablist__panel" id="tabpanel01" role="tabpanel" aria-labelledby="tab01">
                  <div>
                      <MapChart ref={mapChartRef} id="map_viewer" dataSource={activeData} legendMaxColor="#208f04" />
                  </div>
                </div>
                {/* <div className="dts-tablist__panel hidden" id="tabpanel02" role="tabpanel" aria-labelledby="tab02">
                  <div className="dts-placeholder">
                    <span>Placeholder map 2</span>
                  </div>
                </div>
                <div className="dts-tablist__panel hidden" id="tabpanel03" role="tabpanel" aria-labelledby="tab03">
                  <div className="dts-placeholder">
                    <span>Placeholder map 3</span>
                  </div>
                </div> */}
              </div>
            </section>
          </>
        )}

          <section className="dts-page-section">
              <div className="mg-container">
                <h2 className="dts-heading-2">{ ld.cpDisplayName } impacts on sectors</h2>

                  <div className="mg-grid mg-grid__col-3">
                    <div className="dts-data-box">
                      <h3 className="dts-body-label">
                        <span>Damage</span>
                      </h3>
                      <div className="dts-placeholder" style={{height: '400px'}}>
                          <CustomPieChart data={ ld.sectorDamagePieChartData } />
                      </div>
                    </div>

                    <div className="dts-data-box">
                      <h3 className="dts-body-label">
                        <span>Losses</span>
                      </h3>
                      <div className="dts-placeholder" style={{height: '400px'}}>
                          <CustomPieChart data={ ld.sectorLossesPieChartData } />
                      </div>
                    </div>

                    <div className="dts-data-box">
                      <h3 className="dts-body-label">
                        <span>Recovery need</span>
                      </h3>
                      <div className="dts-placeholder" style={{height: '400px'}}>
                          <CustomPieChart data={ ld.sectorRecoveryPieChartData } />
                      </div>
                    </div>
                  </div>

                  <div className="mg-grid mg-grid__col-1">
                    <div className="dts-data-box">
                      <div className="dts-indicator dts-indicator--target-box-a">
                        <span>Bar chart</span>
                      </div>
                    </div>
                  </div>
              </div>
          </section>


          <section className="dts-page-section">
              <div className="mg-container">
                <h2 className="dts-heading-3">Details of effects</h2>

                <div className="mg-grid mg-grid__col-3">
                  <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Damage in [sector] in [currency]</span>
                    </h3>
                    <div className="dts-indicator dts-indicator--target-box-b">
                      <span> todo </span>
                    </div>
                  </div>
                  <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Losses in [sector] in [currency]</span>
                    </h3>
                    <div className="dts-indicator dts-indicator--target-box-c">
                      <span> todo </span>
                    </div>
                  </div>

                  <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Recovery in [sector] in [currency]</span>
                    </h3>
                    <div className="dts-indicator dts-indicator--target-box-d">
                      <span> todo </span>
                    </div>
                  </div>


                </div>

                <div className="mg-grid mg-grid__col-3">
                    <div className="dts-data-box">
                      <div className="dts-indicator dts-indicator--target-box-b">
                        <span>Sub-sector pie chart</span>
                      </div>
                    </div>
                    <div className="dts-data-box">
                      <div className="dts-indicator dts-indicator--target-box-c">
                        <span>Sub-sector pie chart</span>
                      </div>
                    </div>

                    <div className="dts-data-box">
                      <div className="dts-indicator dts-indicator--target-box-d">
                        <span>Sub-sector pie chart</span>
                      </div>
                    </div>
                  </div>

              </div>
          </section>


          <section className="dts-page-section">
              <div className="mg-container">
                <h2 className="dts-heading-3">Detailed effects in [selected sector]</h2>

                <div className="mg-grid mg-grid__col-1">
                  <div className="dts-data-box">
                    <div className="dts-indicator dts-indicator--target-box-a">
                      <span>Table raw data</span>
                    </div>
                  </div>
                </div>
              </div>
          </section>

          
      

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
