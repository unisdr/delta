import {authLoaderWithPerm} from "~/util/auth";
import {MainContainer} from "~/frontend/container";
import {Link} from "@remix-run/react";

export const loader = authLoaderWithPerm("EditData", async () => {
	return null
});

export default function Screen() {
	return (
		<MainContainer title="Disaster Record TODO">
			<p className="wip-message">
				<Link to="./human-effects">View/Edit Human Effects</Link>
			</p>
		</MainContainer>
	);
}

