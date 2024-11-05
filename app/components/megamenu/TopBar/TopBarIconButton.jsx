import React from "react";
import { Icons } from "~/components/megamenu/icons";

export function TopBarIconButton({ onClick, icon }) {
  return (
    <button className="mg-mega-topbar__icon-button" onClick={onClick}>
      <Icons 
        src={icon}
      />
    </button>
  )
}
