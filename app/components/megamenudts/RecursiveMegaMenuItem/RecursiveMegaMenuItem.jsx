import React from "react";

function RecursiveListItem({ title, url, items }) {
  return (
    <li className="recursive-menu-item">
      <a href={url}>{title}</a>
      {items && items.length > 0 && (
        <ol className="recursive-menu-item__children">
          {items.map((subItem, index) => (
            <RecursiveListItem key={index} {...subItem} />
          ))}
        </ol>
      )}
    </li>
  );
};

export function RecursiveListMenu({ items }) {
  return (
    <ol className="recursive-menu">
      {items.map((item, index) => (
        <RecursiveListItem key={index} {...item} />
      ))}
    </ol>
  );
}