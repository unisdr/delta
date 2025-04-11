import { useOutletContext, useFetcher } from "@remix-run/react";
import { authLoaderPublicOrWithPerm , authActionWithPerm} from "~/util/auth";
import {
  getSectorAncestorById, 
  sectorChildrenById,
  sectorById
} from "~/backend.server/models/sector";
import { useLoaderData } from "@remix-run/react";

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {

  const req = loaderArgs.request;
  // Parse the request URL
  const parsedUrl = new URL(req.url);

  // Extract query string parameters
  const queryParams = parsedUrl.searchParams;
  const disasterEventId = queryParams.get('disasterEventId') || ''; 
  const sectorid = queryParams.get('sectorid') || ''; 
  const subsectorid = queryParams.get('subsectorid') || ''; 
  let sectorData:any = {};

  if (!disasterEventId || !sectorid) {
    throw new Response("Missing required parameters", { status: 400 });
  }

  if (sectorid.length > 0 && subsectorid.length > 0) {
    sectorData = await sectorById(Number(subsectorid), true);
  }
  else if (sectorid.length > 0) {
    sectorData = await sectorById(Number(sectorid), true);
  }
  else {
    throw new Response("Missing required parameters", { status: 400 });
  }

  

  console.log('Child Loader: ', req.url, disasterEventId, sectorid, subsectorid, sectorData);

  return {
    sectorData: sectorData,
  };
});

export const action = authActionWithPerm("ViewData", async (actionArgs) => {
  const req = actionArgs.request;
  const formData = await req.formData();

  console.log('Child Action: ', req.url, formData);

  return {};
});

export default function DetailSectorEffectScreen() {
  const myValue = useOutletContext();
  const fetcher = useFetcher();
    const ld = useLoaderData<{
      sectorData: any, 
    }>();

  console.log( myValue );

  return (
    <>
        <fetcher.Form method="post" action="#">

        </fetcher.Form>

        <section className="dts-page-section">
              <div className="mg-container">
                <h2 className="dts-heading-3">Details of effects</h2>

                <div className="mg-grid mg-grid__col-3">
                  <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Damage in {ld.sectorData.sectorname} in [currency]</span>
                    </h3>
                    <div className="dts-indicator dts-indicator--target-box-b">
                      <span> todo </span>
                    </div>
                  </div>
                  <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Losses in {ld.sectorData.sectorname} in [currency]</span>
                    </h3>
                    <div className="dts-indicator dts-indicator--target-box-c">
                      <span> todo </span>
                    </div>
                  </div>

                  <div className="dts-data-box">
                    <h3 className="dts-body-label">
                      <span>Recovery in {ld.sectorData.sectorname} in [currency]</span>
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