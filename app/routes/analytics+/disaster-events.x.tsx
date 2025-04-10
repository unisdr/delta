import { useOutletContext, useFetcher } from "@remix-run/react";
import { authLoaderPublicOrWithPerm , authActionWithPerm} from "~/util/auth";


// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {

  const req = loaderArgs.request;

  console.log('Child Loader: ', req.url);

  return {};
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

  console.log( myValue );

  return (
    <>
        <fetcher.Form method="post" action="#">
          <section className="dts-page-section">
            <div className="mg-grid mg-grid__col-2">
              <div className="dts-form-component"><label>Sector *</label>
                <select id="sector-select" className="filter-select" name="sector" required>
                  <option value="">Select Sector</option>
                  <option value="11">Agriculture</option>
                  <option value="14">Commerce and Trade</option>
                  <option value="36">Community infrastructure</option>
                  <option value="24">Culture</option>
                  <option value="45">Disaster Risk Management</option>
                  <option value="22">Education</option>
                  <option value="44">Employment, Livelihoods and social protection</option>
                  <option value="32">Energy and Electricity</option>
                  <option value="41">Environment</option>
                  <option value="42">Gender</option>
                  <option value="43">Governance</option>
                  <option value="21">Health</option>
                  <option value="23">Housing</option>
                  <option value="12">Industry</option>
                  <option value="33">Information and Communication</option>
                  <option value="35">Sanitation</option>
                  <option value="15">Services</option>
                  <option value="13">Tourism</option>
                  <option value="31">Transportation</option>
                  <option value="34">Water</option>
                </select>
              </div>
              <div className="dts-form-component">
                  <label>Sub Sector</label>
                  <select id="sub-sector-select" className="filter-select"  name="sub-sector">
                    <option  value="">Select Sector First</option>
                </select>
              </div>
            </div>  
            <div className="mg-grid mg-grid__col-2">
              <div className="mg-grid mg-grid__col-2 dts-form__actions">
                <button className="mg-button mg-button--small mg-button-outline" type="reset">Clear</button>
                <button className="mg-button mg-button--small mg-button-primary" type="submit">Apply filters</button>
              </div>
            </div>
          </section>
        </fetcher.Form>

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


    </>
  );
}