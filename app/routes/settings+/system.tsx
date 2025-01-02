import type { MetaFunction } from "@remix-run/node";

import { Link, useLoaderData } from "@remix-run/react";

import { authLoaderGetAuth, authLoaderWithPerm } from "~/util/auth";

import { getSupportedTimeZone } from "~/util/timezone";

import { getCurrency } from "~/util/currency";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { Input } from "~/frontend/form";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
  const { user } = authLoaderGetAuth(loaderArgs);
  const timeZones: string[] = getSupportedTimeZone();
  const currency: string[] = getCurrency();
  const systemLanguage: string[] = ["English"];

  return {
    message: `Hello ${user.email}`,
    currency: currency,
    timeZones: timeZones,
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
          <label style={{ margin: "0px 20px" }}>
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
              {loaderData.timeZones.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
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
          {/* <label>
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
              {loaderData.currency.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label> */}
        </div>
        <div className="flex">
          <ul>
            <li>
              <strong>Date installed:</strong> 09-01-2025
            </li>
            <li>
              <strong>Last updated:</strong> 12-01-2025 T00:00:0000:00
            </li>
            <li>
              <strong>Update available:</strong> 00.00.02:{" "}
              <Link to={""}>
                <u>See release notes</u>{" "}
                <img
                  src="/public/assets/icons/external-link-open-new.svg"
                  alt="Trash Icon"
                  style={{ marginRight: "8px" }}
                />
              </Link>
            </li>
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
