import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ErrorMessage } from "~/frontend/components/ErrorMessage";
import { MainContainer } from "~/frontend/container";

/**
 * Meta function for the page
 */
export const meta: MetaFunction = () => {
    return [
        { title: "Access Denied - DTS" },
        { name: "description", content: "Unauthorized access error page." },
    ];
};

/**
 * Loader function to handle error parameters
 */
export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const reason = url.searchParams.get("reason") || "unauthorized";

    return { reason };
}

/**
 * Error page for unauthorized tenant access
 */
export default function UnauthorizedError() {
    const { reason } = useLoaderData<typeof loader>();

    // Generate user-friendly error message based on reason
    let errorMessage = "You don't have permission to access this resource.";

    switch (reason) {
        case "no-tenant":
            errorMessage = "Your account is not associated with any country. Please contact your administrator or technical support for assistance.";
            break;
        case "tenant-not-found":
            errorMessage = "The country associated with your account could not be found. Please contact your administrator or technical support.";
            break;
        case "access-denied":
            errorMessage = "You don't have permission to access this resource. Please contact your administrator or technical support.";
            break;
    }

    return (
        <MainContainer title="Access Denied">
            <div className="mg-grid">
                <div className="mg-grid__col mg-grid__col--12 mg-grid__col--md-8 mg-grid__col--md-offset-2">
                    <ErrorMessage
                        message={errorMessage}
                        type="error"
                    />

                    <div className="mg-u-text-align--center mg-u-margin-top--lg">
                        <a href="/user/login" className="mg-button mg-button--primary">
                            Return to Login
                        </a>
                        <a href="/" className="mg-button mg-button--secondary mg-u-margin-left--md">
                            Go to Home
                        </a>
                    </div>
                </div>
            </div>
        </MainContainer>
    );
}
