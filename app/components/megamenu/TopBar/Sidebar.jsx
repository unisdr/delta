import React from "react";
import { useState } from "react";
import {ChevronLeftCircleIcon} from "~/components/megamenu/icons/icons"
import { Icons } from "~/components/megamenu/icons";



function SidebarSection ({ section, display, onClick }) {
  const [itemIndex, setItemIndex] = useState(null);

  const onItemToggle = (index) => {
    if (index === itemIndex) {
      setItemIndex(null);
      return
    }
    setItemIndex(index);
  }

  return (
    <div className="mg-mega-sidebar-section">
      <div className="mg-mega-sidebar-section__item" onClick={(val) => onClick(val)}>
        <span>{section.title}</span>
        <Icons src={chevronLeftIcon} />
      </div>
      {
        display && (
          <ol>
            {
              section.items.map((item, index) => (
                <li key={index}>
                  <div
                    onClick={() => onItemToggle(index)} className="mg-mega-sidebar-section__item"
                  >
                    <span>{section.title}</span>
                    <Icons src={<ChevronLeftCircleIcon />} />
                  </div>
                  {
                    index === itemIndex && (
                      <ol>
                        {
                          item.subItems.map((subItem, index) => (
                            <li key={index}>
                              <a href={subItem.url}>{subItem.title}</a>
                            </li>
                          ))
                        }
                      </ol>
                    )
                  }
                </li>
              ))
            }
          </ol>
        )
      }
    </div>
  )
}

export function Sidebar({ sections }) {
  const [sectionIndex, setSectionIndex] = useState(null);

  const onSectionToggle = (index) => {
    if (index === sectionIndex) {
      setSectionIndex(null);
      return
    }
    setSectionIndex(index);
  }

  return (
    <div className="sidebar">
      <div>
        {
          sections.map((section, index) => (
            <SidebarSection section={section} key={index} display={sectionIndex === index} onClick={() => onSectionToggle(index)}/>
          ))
        }
      </div>
    </div>
  )
} 
