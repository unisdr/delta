import React from "react";
import { useState, useEffect, useRef } from "react";
import { TopBar } from "./TopBar/TopBar";
import { Sidebar } from "./TopBar/Sidebar";
import { useBreakpoint } from "./TopBar/hook";

const MegaMenu = ({ sections, delay = 300 }) => {
  const [section, setSection] = useState(null);
  const [itemIndex, setItemIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const breakpoint = useBreakpoint();

  // Use ref for timeoutId to prevent re-renders
  const timeoutRef = useRef(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSection(null);
    }, delay);
  };

  const handleMouseEnter = (item) => {
    clearTimeout(timeoutRef.current);
    setSection(item);
  };

  useEffect(() => {
    if (breakpoint !== "mobile") {
      setShowSidebar(false);
    }
  }, [breakpoint]);

  return (
    <nav
      className="mg-mega-wrapper"
      onMouseLeave={handleMouseLeave}
      aria-label="Main Navigation"
    >
      <TopBar
        sections={sections}
        onItemHover={setSection}
        toggleShowSidebar={() => setShowSidebar((prev) => !prev)}
        showSidebar={showSidebar}
      />

      {section && (
        <article className="mg-mega-content" aria-live="polite">
          <aside className="mg-mega-content__left">
            <section className="mg-mega-content__banner">
              <header>{section.bannerHeading}</header>
              <p>{section.bannerDescription}</p>
            </section>
            <ul className="mg-mega-content__section-list" role="list">
              {section.items.map((item, index) => (
                <li
                  key={index}
                  className="mg-mega-content__section-list-item"
                  onMouseEnter={() => setItemIndex(index)}
                >
                  <a
                    className={`mg-mega-content__section-list-link ${
                      itemIndex === index
                        ? "mg-mega-content__section-list-link--active"
                        : ""
                    }`}
                    href={item.url}
                    aria-current={itemIndex === index ? "page" : undefined}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
          <section className="mg-mega-content__right">
            <ul role="list">
              {section.items[itemIndex].subItems.map((subItem, subIndex) => (
                <li key={subIndex}>
                  <a href={subItem.url}>{subItem.title}</a>
                </li>
              ))}
            </ul>
          </section>
        </article>
      )}
      {showSidebar && (
        <Sidebar sections={sections} onClose={() => setShowSidebar(false)} />
      )}
    </nav>
  );
};

export default MegaMenu;
