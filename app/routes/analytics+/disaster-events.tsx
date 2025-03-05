import React, { useState, useRef, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { authLoader, authLoaderGetAuth, authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { Filters } from "~/frontend/analytics/disaster-events/sections/DisasterEventFilters";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config";
import { getSectorFullPathById } from "~/backend.server/models/sector";
import { 
  disasterEventSectorsById,
  disasterEvent_DisasterRecordsCount__ById, 
  disasterEventTotalDamages__ById,
} from "~/backend.server/models/disaster-event";

import {
	disasterEventById,
	DisasterEventViewModel,
} from "~/backend.server/models/event";

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
  let totalDamages:any = undefined;

  if (xId) {
    record = await disasterEventById(xId).catch(console.error);
    if  ( record ) {
      try {
        // console.log( xId );
        // console.log( typeof xId );
        // console.log( record );
        // getSectorFullPathById()

        // get all related sectors
        recordsRelatedSectors = await disasterEventSectorsById(xId);
        // get the count of Disaster Records linked to the disaster event
        countRelatedDisasterRecords = await disasterEvent_DisasterRecordsCount__ById(xId);
        
        totalDamages = await disasterEventTotalDamages__ById(xId);
        // console.log( totalDamages );
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
    total: totalDamages,
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
    cpDisplayName: string
  }>();

  // State declarations
  const [filters, setFilters] = useState<{
    disasterEventId: string | null;
  } | null>(null);

  // Event handlers for Filters component
  const handleApplyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleAdvancedSearch = () => {
    // TODO: Implement advanced search functionality
    console.log("Advanced search clicked");
  };

  const handleClearFilters = () => {
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
      }
    }, []);



  

  console.log( ld.record?.startDate );
  console.log( ld.record?.endDate );

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
                                    value={""} 
                                    displayName={""} 
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
                                  />
                              </label>
                          </div>
                      </div>
                      <div className="dts-form__actions">
                          <button ref={btnSubmitRef} type="submit" className="mg-button mg-button--small mg-button-primary" disabled>Apply filters</button>
                          <button ref={btnCancelRef} onClick={handleClearFilters} type="button" className="mg-button mg-button--small mg-button-outline" disabled>Clear</button>
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

          {/* Dashboard sections */}
          {filters && (
            <div className="disaster-events-content" style={{ marginTop: "2rem", maxWidth: "100%", overflow: "hidden" }}>
              {/* TODO: Add dashboard sections here */}

            </div>
          )}
        </div>

        {ld.record && (<>
        
        <section className="dts-page-section">
        <div className="mg-container">
          <h2 className="dts-heading-2">[Name of the disaster event]</h2>
          <p>Affiliated record(s): { ld.countRelatedDisasterRecords }</p>

          {
            Array.isArray(ld.recordsRelatedSectors) && ld.recordsRelatedSectors.length > 0 && <>
                <p>
                {
                  Array.isArray(ld.recordsRelatedSectors) && ld.recordsRelatedSectors.map((sector, index) => (<>
                      {sector.sectorname}
                      {ld.recordsRelatedSectors.length == (index + 1) ? ' ' : ', '}
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
          
          
          <div className="mg-grid mg-grid__col-3">
            <div className="dts-data-box">
              <h3 className="dts-body-label">
                <span id="elementId03">Damage in [{ ld.total.damages.currency }]</span>
                <button type="button" className="dts-tooltip__button" aria-labelledby="elementId03" aria-describedby="tooltip03">
                  <svg aria-hidden="true" focusable="false" role="img">
                    <use href="assets/icons/information_outline.svg#information"></use>
                  </svg>
                </button>
                <div id="tooltip03" role="tooltip">
                  <span>Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.</span>
                  <div className="dts-tooltip__arrow"></div>
                </div>
              </h3>
              <div className="dts-indicator dts-indicator--target-box-d">
                <span>{ ld.total.damages.total }</span>
              </div>
            </div>
            <div className="dts-data-box">
              <h3 className="dts-body-label">
                <span id="elementId04">Losses in [{ ld.total.losses.currency }]</span>
                <button type="button" className="dts-tooltip__button" aria-labelledby="elementId04" aria-describedby="tooltip04">
                  <svg aria-hidden="true" focusable="false" role="img">
                    <use href="assets/icons/information_outline.svg#information"></use>
                  </svg>
                </button>
                <div id="tooltip04" role="tooltip">
                  <span>Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.</span>
                  <div className="dts-tooltip__arrow"></div>
                </div>
              </h3>
              <div className="dts-indicator dts-indicator--target-box-c">
                <span>{ ld.total.losses.total }</span>
              </div>
            </div>
            <div className="dts-data-box">
              <h3 className="dts-body-label">
                <span id="elementId05">Recovery [currency]</span>
                <button type="button" className="dts-tooltip__button" aria-labelledby="elementId05" aria-describedby="tooltip05">
                  <svg aria-hidden="true" focusable="false" role="img">
                    <use href="assets/icons/information_outline.svg#information"></use>
                  </svg>
                </button>
                <div id="tooltip05" role="tooltip">
                  <span>Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.</span>
                  <div className="dts-tooltip__arrow"></div>
                </div>
              </h3>
              <div className="dts-indicator dts-indicator--target-box-f">
                <span>-</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dts-page-section">
        <div className="mg-container">
          <h2 className="dts-heading-2">Human direct effects</h2>

          <div className="mg-grid mg-grid__col-3">
            <div className="dts-data-box">
                <h3 className="dts-body-label">
                  <span id="elementId04">Total people affected</span>
                  <button type="button" className="dts-tooltip__button" aria-labelledby="elementId04" aria-describedby="tooltip04">
                    <svg aria-hidden="true" focusable="false" role="img">
                      <use href="assets/icons/information_outline.svg#information"></use>
                    </svg>
                  </button>
                  <div id="tooltip04" role="tooltip">
                    <span>Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.</span>
                    <div className="dts-tooltip__arrow"></div>
                  </div>
                </h3>
                <div className="dts-indicator dts-indicator--target-box-c">
                  <span>-</span>
                </div>
              </div>
          </div>

        </div>
      </section>



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
              <button type="button" className="dts-tablist__button" role="tab" id="tab02" aria-controls="tabpanel02" aria-selected="false">
                <span>Total Affected</span>
              </button>
            </li>
            <li role="presentation">
              <button type="button" className="dts-tablist__button" role="tab" id="tab03" aria-controls="tabpanel03" aria-selected="false">
                <span>Total Loss</span>
              </button>
            </li>
          </ul>
          <div className="dts-tablist__panel" id="tabpanel01" role="tabpanel" aria-labelledby="tab01">
            <div className="dts-placeholder">
              <span>Placeholder map 1</span>
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
