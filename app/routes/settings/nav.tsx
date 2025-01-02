import { NavLink, useLocation } from "react-router-dom";

export function NavSettings() {
  const location = useLocation();

  // Dynamically generate menu based on the active section
  let menu: { link: string; text: string }[] = [];

  switch (true) {
    case location.pathname.includes("/analytics"):
      menu = [
        {
          link: "analytics/human-direct-effects",
          text: "Human Direct Effects",
        },
        { link: "analytics/sectors", text: "Sectors" },
        { link: "analytics/hazards", text: "Hazards" },
        { link: "analytics/disaster-events", text: "Disaster Events" },
      ];
      break;

    case location.pathname.includes("/settings"):
      menu = [
        { link: "settings/access-mgmnt", text: "Access management" },
        { link: "settings/system", text: "System settings" },
        { link: "settings/geography", text: "Geographic levels" },
        { link: "settings/sectors", text: "Sectors" },
      ];
      break;

    case location.pathname.includes("/about"):
      menu = [
        { link: "about/about-the-system", text: "About the System" },
        {
          link: "about/technical-specifications",
          text: "Technical Specifications",
        },
        { link: "about/partners", text: "Partners" },
        { link: "about/methodologies", text: "Methodologies" },
        { link: "about/support", text: "Support" },
      ];
      break;

    default:
      menu = [];
  }

  return (
    <nav className="dts-sub-navigation">
      <div className="mg-container">
        <div className="dts-sub-navigation__container">
          <ul>
            {menu.map((item, index) => (
              <li key={index}>
                <NavLink
                  key={index}
                  to={`/${item.link}`}
                  className={({ isActive, isPending }) =>
                    isActive ? "active" : isPending ? "pending" : ""
                  }
                >
                  {item.text}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
