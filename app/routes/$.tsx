import { json, LoaderFunction } from "@remix-run/node";
import { useRouteError, useLoaderData } from "@remix-run/react";

export const loader: LoaderFunction = async ( request ) => {
    const url = new URL(request.request.url);

    // console.log("Catch-all route path not found:", url.pathname);
    // return json({ message: "We couldn't find the page you were looking for." }, { status: 404 });

    return json({ }, { status: 404 });
  };

export default function CatchAllRoute() {
//   const error = useRouteError();
  const loaderData = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>404 - Page not found</h1>
      {loaderData.message ? (
        <p>{loaderData.message}</p>
      ) : (
        <p>We couldn't find the page you were looking for.</p>
      )}
    </div>
  );
}