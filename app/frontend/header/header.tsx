import { useEffect, useState } from "react";

import { MegaMenu } from "~/frontend/megamenu2/megamenu";

import { Lvl1Item } from "~/frontend/megamenu2/common";

interface HeaderProps {
  loggedIn: boolean;
  siteName: string;
  siteLogo: string;
}

interface LogoProps {
  src: string;
  alt: string;
}

const LogoComponent = ({ src, alt }: LogoProps) => {
  if (src.length === 0) {
    return "";
  } else {
    return <img src={src} alt={alt} />;
  }
};

export function Header({ loggedIn, siteName, siteLogo }: HeaderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  let navItems = navItemsNotLoggedIn();
  if (loggedIn) {
    navItems = navItemsLoggedIn();
  }

  return (
    <>
      <header className={`dts-main-header ${isClient ? "js-enabled" : ""}`}>
        <div className="logo">
          <LogoComponent src={siteLogo} alt="" />
          <span className="title">{siteName}</span>
          <span className="empty"></span>
        </div>
        <MegaMenu items={navItems} />
      </header>
    </>
  );
}

function navItemsNotLoggedIn(): Lvl1Item[] {
  return [
    {
      name: "Data",
      title: "Data by country",
      icon: "undp/calendar",
      lvl2: [
        {
          name: "Group 1",
          id: "group1",
          lvl3: [
            {
              title: "Events",
              lvl4: [
                { name: "Hazardous events", link: "/hazard-event" },
                { name: "Disaster events", link: "/disaster-event" },
              ],
            },
            {
              title: "Disaster records",
              lvl4: [
                { name: "Disaster records", link: "#" },
                { name: "PDNA resources repository", link: "/resource-repo" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Analysis",
      title: "In-depth Analysis",
      icon: "undp/calendar",
      lvl2: [
        {
          name: "Trends",
          id: "trends",
          lvl3: [
            {
              title: "Yearly Analysis",
              lvl4: [
                {
                  name: "Human Direct Effects",
                  link: "/analytics/human-direct-effects",
                },
                { name: "Sectors", link: "/analytics/sectors" },
                { name: "Hazards", link: "/analytics/hazards" },
                { name: "Disaster Events", link: "/analytics/disaster-events" },
              ],
            },
            {
              title: "Latest data",
              lvl4: [
                { name: "News", link: "#" },
                { name: "Feedback", link: "#" },
              ],
            },
          ],
        },
        {
          name: "Sources and process",
          id: "sources_and_process",
          lvl3: [
            {
              title: "Sources",
              lvl4: [
                { name: "2024 Report", link: "#" },
                { name: "2023 Report", link: "#" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "About",
      title: "About Us",
      icon: "other/about",
      lvl2: [
        {
          name: "General",
          id: "project_info",
          lvl3: [
            {
              title: "General",
              lvl4: [
                { name: "About the system", link: "/about/about-the-system" },
                {
                  name: "Technical specifications",
                  link: "/about/technical-specifications",
                },
                { name: "Partners", link: "/about/partners" },
                { name: "Methodologies", link: "/about/methodologies" },
                { name: "Support", link: "/about/support" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Log in",
      title: "User Login",
      icon: "undp/calendar",
      link: "/user/login",
    },
  ];
}

function navItemsLoggedIn(): Lvl1Item[] {
  return [
    {
      name: "Data",
      title: "Data by country",
      icon: "other/data",
      lvl2: [
        {
          name: "Data management",
          id: "group1",
          lvl3: [
            {
              title: "Events",
              lvl4: [
                { name: "Hazardous events", link: "/hazard-event" },
                { name: "Disaster events", link: "/disaster-event" },
              ],
            },
            {
              title: "Disaster records",
              lvl4: [
                { name: "Disaster records", link: "#" },
                { name: "PDNA resources repository", link: "/resource-repo" },
              ],
            },
            {
              title: "Baseline data",
              lvl4: [
                { name: "Item 1", link: "#" },
                { name: "Item 2", link: "#" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Analysis",
      title: "In-depth Analysis",
      icon: "other/analysis",
      lvl2: [
        {
          name: "Trends",
          id: "trends",
          lvl3: [
            {
              title: "Yearly Analysis",
              lvl4: [
                {
                  name: "Human Direct Effects",
                  link: "/analytics/human-direct-effects",
                },
                { name: "Sectors", link: "/analytics/sectors" },
                { name: "Hazards", link: "/analytics/hazards" },
                { name: "Disaster Events", link: "/analytics/disaster-events" },
              ],
            },
            {
              title: "Latest data",
              lvl4: [
                { name: "News", link: "#" },
                { name: "Feedback", link: "#" },
              ],
            },
          ],
        },
        {
          name: "Sources and process",
          id: "sources_and_process",
          lvl3: [
            {
              title: "Sources",
              lvl4: [
                { name: "2024 Report", link: "#" },
                { name: "2023 Report", link: "#" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "About",
      title: "About Us",
      icon: "other/about",
      lvl2: [
        {
          name: "General",
          id: "project_info",
          lvl3: [
            {
              title: "General",
              lvl4: [
                { name: "About the system", link: "/about/about-the-system" },
                {
                  name: "Technical specifications",
                  link: "/about/technical-specifications",
                },
                { name: "Partners", link: "/about/partners" },
                { name: "Methodologies", link: "/about/methodologies" },
                { name: "Support", link: "/about/support" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Settings",
      title: "User and System Settings",
      icon: "other/settings",
      lvl2: [
        {
          name: "Main settings",
          id: "main-settings",
          lvl3: [
            {
              title: "System",
              lvl4: [
                { name: "Access Management", link: "/settings/access-mgmnt" },
                { name: "System settings", link: "/settings/system" },
                { name: "Geographic levels", link: "/settings/geography" },
                { name: "Sectors", link: "/settings/sectors" },
                { name: "HIPs import", link: "/setup/import-hip" },
                { name: "API Keys", link: "/settings/api-key" },
              ],
            },
            {
              title: "Your profile",
              lvl4: [
                { name: "Change password", link: "/user/change-password" },
                { name: "TOTP (2FA)", link: "/user/totp-enable" },
              ],
            },
          ],
        },
        {
          name: "User",
          id: "user-settings",
          lvl3: [
            {
              title: "Account",
              lvl4: [
                { name: "Change Password", link: "#" },
                { name: "Change Email", link: "#" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Log out",
      title: "User Login",
      icon: "undp/calendar",
      link: "/user/logout",
    },
  ];
}
