import { NavLink } from "@remix-run/react";
import { useLocation } from "@remix-run/react";
import { useMemo } from "react";

export function NavSettings() {
  const location = useLocation();

  // Memoize menu to prevent unnecessary recalculations
  const menu = useMemo(() => {
    if (location.pathname.includes("/analytics")) {
      return [
        // {
        //   link: "analytics/human-direct-effects",
        //   text: "Human Direct Effects",
        // },
        { link: "analytics/sectors", text: "Sectors" },
        { link: "analytics/hazards", text: "Hazards" },
        { link: "analytics/disaster-events", text: "Disaster Events" },
      ];
    }

    if (location.pathname.includes("/settings")) {
      return [
        { link: "settings/system", text: "System settings" },
        { link: "settings/geography", text: "Geographic levels" },
        { link: "settings/sectors", text: "Sectors" },
        { link: "settings/access-mgmnt", text: "Access management" }
      ];
    }

    if (location.pathname.includes("/about")) {
      return [
        { link: "about/about-the-system", text: "About the System" },
        {
          link: "about/technical-specifications",
          text: "Technical Specifications",
        },
        { link: "about/partners", text: "Partners" },
        { link: "about/methodologies", text: "Methodologies" },
        { link: "about/support", text: "Support" },
      ];
    }

    return [];
  }, [location.pathname]);

  // If location is not available during SSR, render a placeholder
  if (!location) {
    return null;
  }

  return (
    <nav className="dts-sub-navigation">
      <div className="mg-container">
        <div className="dts-sub-navigation__container">
          <ul className="dts-sub-navigation__list">
            {menu.map(({ link, text }) => (
              <li key={link} className="dts-sub-navigation__item">
                <NavLink
                  to={`/${link}`}
                  className={({ isActive }) =>
                    isActive
                      ? "dts-sub-navigation__link dts-sub-navigation__link--active"
                      : "dts-sub-navigation__link"
                  }
                >
                  {text}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
