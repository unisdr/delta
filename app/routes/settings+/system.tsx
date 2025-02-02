import type { MetaFunction } from "@remix-run/node";

import { Link, useLoaderData } from "@remix-run/react";

import { authLoaderGetAuth, authLoaderWithPerm } from "~/util/auth";

import { getSupportedTimeZone } from "~/util/timezone";

import { getCurrency } from "~/util/currency";
import { configCurrencies, configApplicationVersion } from  "~/util/config";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { Input } from "~/frontend/form";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
  const { user } = authLoaderGetAuth(loaderArgs);
  const timeZones: string[] = getSupportedTimeZone();
  const currency: string[] = configCurrencies();
  const systemLanguage: string[] = ["English"];


  const confAppVersion = await configApplicationVersion().then(version => {
    return version;
  }).catch(error => {
    console.error('Error:', error);
  });

  return {
    message: `Hello ${user.email}`,
    currencyArray: currency,
    timeZonesArray: timeZones,
    appVersion: confAppVersion,
    systemLanguage: systemLanguage,
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
      <>
        <div className="flex">
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
          <label style={{ margin: "0px 20px" }}>
            <strong>System language</strong> &nbsp;
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
              {loaderData.systemLanguage.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <strong>Currency</strong> &nbsp;
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
              {loaderData.currencyArray.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex">
          <ul>
            <li>
              <strong>Current version of the application:</strong> { loaderData.appVersion }
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
      </>
    </MainContainer>
  );
}
