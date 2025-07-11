import { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader: LoaderFunction = async ( ) => {
    // console.log("Catch-all route path not found:", url.pathname);
    // return json({ message: "We couldn't find the page you were looking for." }, { status: 404 });

    return Response.json({ }, { status: 404 });
  };

export default function CatchAllRoute() {
//   const error = useRouteError();
  const loaderData = useLoaderData<typeof loader>();
  
  return (<>
			<header className="dts-page-title">
				<div className="mg-container">
					<h1 className="dts-heading-1">404 - Page not found</h1>
				</div>
			</header>
			<section>
				<div className="mg-container">
          {loaderData.message ? (
            <p>{loaderData.message}</p>
          ) : (
            <p>We couldn't find the page you were looking for.</p>
          )}
        </div>
      </section>
  </>);
}
