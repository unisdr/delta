import { useOutletContext, useFetcher } from "@remix-run/react";
import { authLoaderPublicOrWithPerm , authActionWithPerm} from "~/util/auth";
import {
  getSectorAncestorById, 
  sectorChildrenById,
  sectorById
} from "~/backend.server/models/sector";
import { useLoaderData } from "@remix-run/react";

import { 
  disasterEventSectorsById,
  disasterEvent_DisasterRecordsCount__ById, 
  disasterEventSectorTotal__ById,
  disasterEventSectorTotal__ByDivisionId,
} from "~/backend.server/models/analytics/disaster-events";

import CustomPieChart from '~/components/PieChart';

import {configCurrencies} from "~/util/config";	

interface interfacePieChart {
  name: string;
  value: number;
}

interface interfaceSector {
  id: number;
  sectorname: string;
  level?: number;
  ids?: [];
  subSector?: interfaceSector[];
}

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {

  const req = loaderArgs.request;
  // Parse the request URL
  const parsedUrl = new URL(req.url);
  const sectorPieChartData: Record<number, { damages: interfacePieChart; losses: interfacePieChart; recovery: interfacePieChart }> = {};

  // Extract query string parameters
  const queryParams = parsedUrl.searchParams;
  const xId = queryParams.get('disasterEventId') || ''; 
  const disasterEventId = queryParams.get('disasterEventId') || ''; 
  const qs_sectorid = queryParams.get('sectorid') || ''; 
  const qs_subsectorid = queryParams.get('subsectorid') || ''; 

  let sectorData:any = {};
  let sectorId:number = 0;

  let confCurrencies:any = configCurrencies();

  let sectorDamagePieChartData:interfacePieChart[] = [];
  let sectorLossesPieChartData:interfacePieChart[] = [];
  let sectorRecoveryPieChartData:interfacePieChart[] = [];

  if (!disasterEventId || !qs_sectorid) {
    throw new Response("Missing required parameters", { status: 400 });
  }

  if (confCurrencies.length === 0) {
    throw new Response("Missing required currencies in configuration.", { status: 400 });
  }
  confCurrencies = confCurrencies[0].toUpperCase();
  

  if (qs_sectorid.length > 0 && qs_subsectorid.length > 0) {
    sectorId = Number(qs_subsectorid);
  }
  else if (qs_sectorid.length > 0) {
    sectorId = Number(qs_sectorid);
  }
  else {
    throw new Response("Missing required parameters", { status: 400 });
  }

  sectorData = await sectorById(sectorId, true);

  const sectorChildren =  await sectorChildrenById(sectorId) as {sectorname: string, 
    id: number, 
    relatedAncestorsDecendants: {id: number,
      sectorname: string,
      level: number
    }[]
  }[];
  let sectorChildrenIdsArray:number[] = [];

  // console.log( 'sectorChildrenIdsArray', sectorChildrenIdsArray );
  for (const item of sectorChildren) {
    // console.log('item', item );
    // console.log('item', item.relatedAncestorsDecendants );
    sectorChildrenIdsArray = item.relatedAncestorsDecendants.map(item2 => item2.id);

    let effects = await disasterEventSectorTotal__ById(xId, sectorChildrenIdsArray);

    // console.log( 'effects', item.id, effects, sectorChildrenIdsArray );

    // Populate Sector Pie Chart Data
    if (!sectorPieChartData[item.id] && effects && ((effects.damages && effects.damages.total > 0) || effects.losses.total > 0 || effects.recovery.total > 0)) {
      sectorPieChartData[item.id] = {
        damages: { name: item.sectorname, value: effects.damages.total },
        losses: { name: item.sectorname, value: effects.losses.total },
        recovery: { name: item.sectorname, value: effects.recovery.total }
      }
    }
    else if (sectorPieChartData[item.id] && effects && ((effects.damages && effects.damages.total > 0) || effects.losses.total > 0 || effects.recovery.total > 0)) {
      sectorPieChartData[item.id].damages.value += effects.damages.total;
      sectorPieChartData[item.id].losses.value += effects.losses.total; 
      sectorPieChartData[item.id].recovery.value += effects.recovery.total;
    }
  }
  // console.log('sectorPieChartData:', sectorPieChartData);

  // Extract values only for damage, losses, and recovery
  sectorDamagePieChartData = Object.values(sectorPieChartData).map(entry => entry.damages);
  sectorLossesPieChartData = Object.values(sectorPieChartData).map(entry => entry.losses);
  sectorRecoveryPieChartData = Object.values(sectorPieChartData).map(entry => entry.recovery);

  // console.log('Child Loader: ', req.url, disasterEventId, qs_sectorid, qs_subsectorid, sectorData, sectorChildren);

  return {
    sectorData: sectorData,
    sectorPieChartData: sectorPieChartData,
    sectorDamagePieChartData: sectorDamagePieChartData,
    sectorLossesPieChartData: sectorLossesPieChartData,
    sectorRecoveryPieChartData: sectorRecoveryPieChartData,
    confCurrencies: confCurrencies,
  };
});

export const action = authActionWithPerm("ViewData", async (actionArgs) => {
  const req = actionArgs.request;
  const formData = await req.formData();

  //console.log('Child Action: ', req.url, formData);

  return {};
});

export default function DetailSectorEffectScreen() {
  const myValue = useOutletContext();
  const fetcher = useFetcher();
    const ld = useLoaderData<{
      sectorData: any, 
      sectorPieChartData: any,
      sectorDamagePieChartData: interfacePieChart[],
      sectorLossesPieChartData: interfacePieChart[],
      sectorRecoveryPieChartData: interfacePieChart[],
      confCurrencies: any,
    }>();

  let pieChartHeightContainer = 400;
  let pieChartHeight = 350;
  if (ld.sectorDamagePieChartData.length >= 6 || ld.sectorLossesPieChartData.length >= 6) {
    pieChartHeightContainer += 100;
    pieChartHeight += 100;
  }
  console.log( myValue );

  return (
    <>
          <section className="dts-page-section">
              <div className="mg-container">
                <h2 className="dts-heading-3">Details of effects</h2>

                <div className="mg-grid mg-grid__col-3">
                    {
                      Object.keys(ld.sectorDamagePieChartData).length > 0 && (
                        <div className="dts-data-box">
                          <h3 className="dts-body-label">
                            <span>Damage in {ld.sectorData.sectorname} in {ld.confCurrencies}</span>
                          </h3>
                          <div className="dts-placeholder" style={{height: '${pieChartHeightContainer}px'}}>
                              <CustomPieChart data={ ld.sectorDamagePieChartData } chartHeight={pieChartHeight} boolRenderLabel={false} />
                          </div>
                        </div>
                      )
                    }

                    {
                      Object.keys(ld.sectorLossesPieChartData).length > 0 && (
                        <div className="dts-data-box">
                          <h3 className="dts-body-label">
                            <span>Losses in {ld.sectorData.sectorname} in {ld.confCurrencies}</span>
                          </h3>
                          <div className="dts-placeholder" style={{height: '${pieChartHeightContainer}px'}}>
                              <CustomPieChart data={ ld.sectorLossesPieChartData } chartHeight={pieChartHeight} boolRenderLabel={false} />
                          </div>
                        </div>
                      )
                    }

                    {
                      Object.keys(ld.sectorRecoveryPieChartData).length > 0 && (
                        <div className="dts-data-box">
                          <h3 className="dts-body-label">
                            <span>Recovery in {ld.sectorData.sectorname} in {ld.confCurrencies}</span>
                          </h3>
                          <div className="dts-placeholder" style={{height: '${pieChartHeightContainer}px'}}>
                              <CustomPieChart data={ ld.sectorRecoveryPieChartData } chartHeight={pieChartHeight} boolRenderLabel={false} />
                          </div>
                        </div>
                      )
                    }                   
                  </div>

              </div>
        </section>

        <section className="dts-page-section">
              <div className="mg-container">
                <h2 className="dts-heading-3">Detailed effects in {ld.sectorData.sectorname}</h2>

                <div className="mg-grid mg-grid__col-1">
                  <div className="dts-data-box">
                    <div className="dts-indicator dts-indicator--target-box-a">
                      <span>Table raw data</span>
                    </div>
                  </div>
                </div>
              </div>
        </section>


    </>
  );
}