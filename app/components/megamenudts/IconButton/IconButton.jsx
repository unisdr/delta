import { Icons } from "~/components/megamenudts/icons";

export function IconButton({ onClick, icon }) {
  return (
    <button className="mg-icon-button" onClick={onClick}>
      <Icons 
        src={icon}
      />
    </button>
  )
}
