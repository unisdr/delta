import React from "react";

export function TopBarItem ({ title, onMouseEnter, iconSrc }) {
	console.log("iconSrc", iconSrc)
  return (
    <>
      {(title == '') ? (
        <button className="mg-mega-topbar__item" onMouseEnter={onMouseEnter} aria-label="{title}">
          <svg aria-hidden="true" focusable="false" role="img">
              <use href={iconSrc} />
          </svg>
        </button>
      ) : (
        <button className="mg-mega-topbar__item" onMouseEnter={onMouseEnter}>
          <svg aria-hidden="true" focusable="false" role="img">
              <use href={iconSrc} />
          </svg>
          {title}
        </button>
      )}
    </>
  )
}
