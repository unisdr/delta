import React from "react";
import { TopBarItem } from "./TopBarItem";
import { TopBarIconButton } from "./TopBarIconButton.jsx";
import { useBreakpoint } from "./hook.js";

import {ArrowRightIcon} from "~/components/megamenu/icons/icons"

export function TopBar({ onItemHover, toggleShowSidebar, showSidebar, sections }) {

  const onMouseEnter = (item) => {
    onItemHover(item);
  }

  const breakpoint = useBreakpoint();

  return (
    <div className="mg-mega-topbar">
      {
        breakpoint === 'mobile' ? (
          <TopBarIconButton icon={<ArrowRightIcon />} onClick={() => toggleShowSidebar()}/>
        ) : (
          sections.map((item, index) => (
            <TopBarItem
              key={index}
              title={item.title}
              onMouseEnter={() => onMouseEnter(item)}
            /> 
          ))
        )
      }
    </div>
    )
}
