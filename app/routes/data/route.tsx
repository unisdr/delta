import {
  Outlet,
} from "@remix-run/react";


export const loader = async () => {
  return null;
};

export default function Data() {

 return (
    <div>
      <p>Data</p>
			<Outlet></Outlet>
    </div>
  );
}

