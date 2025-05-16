import type { MetaFunction } from "@remix-run/node";

import { Link, useLoaderData } from "@remix-run/react";

import { authLoaderGetAuth, authLoaderWithPerm } from "~/util/auth";

import { getSupportedTimeZone } from "~/util/timezone";

import { getCurrency } from "~/util/currency";
import {
  configCurrencies,
  configApplicationVersion,
  configCountryInstanceISO,
  configApplicationEmail,
  configFooterURLPrivPolicy,
  configFooterURLTermsConds,
  config2FAIssuer,
  configApprovedRecordsArePublic,
} from "~/util/config";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { Input } from "~/frontend/form";


export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
  const { user } = authLoaderGetAuth(loaderArgs);
  const timeZones: string[] = getSupportedTimeZone();
  const currency: string[] = configCurrencies();
  const systemLanguage: string[] = ["English"];
  const confEmailObj = configApplicationEmail();
  const confPageFooterPrivPolicy = configFooterURLPrivPolicy();
  const confPageFooterTermsConds = configFooterURLTermsConds();
  const conf2FAIssuer = config2FAIssuer();
  const confInstanceTypePublic = configApprovedRecordsArePublic();


  let ctryInstanceName: string = '';

  const confAppVersion = await configApplicationVersion().then(version => {
    return version;
  }).catch(error => {
    console.error('Error:', error);
  });

  const confCtryInstanceISO = configCountryInstanceISO();

  // Fetch data from API
  if (confCtryInstanceISO !== '') {
    const url = "https://data.undrr.org/api/json/gis/countries/1.0.0/?cca3=" + confCtryInstanceISO.toUpperCase();
    const resp = await fetch(url);
    let res: any = {};
    try {
      res = await resp.json();
      ctryInstanceName = res.data[0].name;
    } catch (error) {
      console.error('Error:', error);
    }

  }



  return {
    message: `Hello ${user.email}`,
    currencyArray: currency,
    timeZonesArray: timeZones,
    appVersion: confAppVersion,
    systemLanguage: systemLanguage,
    ctryInstanceName: ctryInstanceName,
    confEmailObj: confEmailObj,
    confCtryInstanceISO: confCtryInstanceISO,
    confPageFooterPrivPolicy: confPageFooterPrivPolicy,
    confPageFooterTermsConds: confPageFooterTermsConds,
    conf2FAIssuer: conf2FAIssuer,
    confInstanceTypePublic: confInstanceTypePublic,
  };
});

export const meta: MetaFunction = () => {
  return [
    { title: "System Settings - DTS" },
    { name: "description", content: "System settings." },
  ];
};

export default function Settings() {
  const loaderData = useLoaderData<typeof loader>();
  // console.log("loaderData", loaderData);

  const box2colStyle = {
    width: "50%",
    height: "100px",
  };

  return (
    <MainContainer title="System settings" headerExtra={<NavSettings />}>
      <div className="mg-section">
        <div className="mg-grid mg-grid__col-3 dts-form-component">
          {/* <label style={{ margin: "0px 20px" }}>
            <strong>Time zone</strong> &nbsp;
            <select
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              <option disabled value="">
                Select from list
              </option>
              {loaderData.timeZonesArray.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label> */}
          <label className="dts-form-component__label">
            <strong>System language</strong> &nbsp;
            <select
              id="system-language"
              name="systemLanguage"
              className="dts-form-component__select"
            >
              <option disabled value="">
                Select from list
              </option>
              {loaderData.systemLanguage.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="dts-form-component__label">
            <strong>Currency</strong> &nbsp;
            <select
              id="currency"
              name="currency"
              className="dts-form-component__select"
            >
              <option disabled value="">
                Select from list
              </option>
              {loaderData.currencyArray.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul style={{ paddingLeft: 20 }}>
          <li>
            <strong>Country instance:</strong>
            <ul>
              {
                loaderData.ctryInstanceName !== '' && (<>
                  <li>
                    <strong>Country:</strong> {loaderData.ctryInstanceName}
                  </li>
                </>)
              }
              <li>
                <strong>ISO 3:</strong> {loaderData.confCtryInstanceISO}
              </li>
              <li>
                <strong>Instance type:</strong> {loaderData.confInstanceTypePublic ? 'Public' : 'Private'}
              </li>
            </ul>
          </li>

          <li>
            <strong>DTS software application version:</strong> {loaderData.appVersion}
          </li>
          <li>
            <strong>System email routing configuration:</strong>
            <ul>
              <li>
                <strong>Transport:</strong> {loaderData.confEmailObj.EMAIL_TRANSPORT}
              </li>
              {
                loaderData.confEmailObj.EMAIL_TRANSPORT == 'smtp' && (<>
                  <li>
                    <strong>Host:</strong> {loaderData.confEmailObj.SMTP_HOST}
                  </li>
                  <li>
                    <strong>Port:</strong> {loaderData.confEmailObj.SMTP_PORT}
                  </li>
                  <li>
                    <strong>Secure:</strong> {loaderData.confEmailObj.SMTP_SECURE}
                  </li>
                </>
                )
              }
            </ul>
          </li>
          {
            loaderData.confPageFooterPrivPolicy !== '' && (<>
              <li>
                <strong>Page Footer for Privacy Policy URL:</strong> {loaderData.confPageFooterPrivPolicy}
              </li>
            </>)
          }
          {
            loaderData.confPageFooterTermsConds !== '' && (<>
              <li>
                <strong>Page Footer for Terms and Condition URL:</strong> {loaderData.confPageFooterTermsConds}
              </li>
            </>)
          }
          <li>
            <strong>2FA/TOTP Issuer Name:</strong> {loaderData.conf2FAIssuer}
          </li>

          {/* <li>
              <strong>Update available:</strong> 00.00.02:{" "}
              <Link to={""}>
                <u>See release notes</u>{" "}
                <img
                  src="/public/assets/icons/external-link-open-new.svg"
                  alt="Trash Icon"
                  style={{ marginRight: "8px" }}
                />
              </Link>
            </li> */}
          <li>
            <strong>System up to date</strong>
          </li>
        </ul>
        {/* <div className="box" style={box2colStyle}></div> */}

      </div>

    </MainContainer>
  );
}
