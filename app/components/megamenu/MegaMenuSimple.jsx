import React from "react";
import { useState, useEffect } from "react";
import { CtaButton } from "./CtaButton";
import { RecursiveListMenu } from "./RecursiveMegaMenuItem/RecursiveMegaMenuItem";

const MegaMenuSimple = ({ sections, delay = 300 }) => {
  let timeoutId = null;
  
  const [section, setSection] = useState(null);


  const handleMouseLeave = () => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      setSection(null);
    }, delay);
  };

  const handleMouseEnter = (item) => {
    clearTimeout(timeoutId);
    setSection(item);
  };


  useEffect(() => {
    // Clean up the timeout when the component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <nav className="mg-mega-wrapper" onMouseLeave={handleMouseLeave}>
      {/* Topbar */}
      <div className="mg-mega-topbar">
        {sections.map((item, index) => (
          <a
            key={index}
            className="mg-mega-topbar__item"
            onMouseEnter={() => handleMouseEnter(item)}
          >
            {item.title}
          </a>
        ))}
      </div>
      {/* Content */}
      {section && (
        <article className="mg-mega-content">
          <aside className="mg-mega-content__left">
            <section className="mg-mega-content__banner">
              <header>{section.bannerHeading}</header>
              <p>{section.bannerDescription}</p>
              <CtaButton label="Learn more" className="button" />
            </section>
          </aside>
          <section className="mg-mega-content__right">
            <RecursiveListMenu items={section.items} />
          </section>
        </article>
      )}
    </nav>
  );
}

export default MegaMenuSimple;
