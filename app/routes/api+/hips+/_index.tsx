import {authLoaderWithPerm} from "~/util/auth";
import {MainContainer} from "~/frontend/container";


export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	return null
})

export default function Screen() {
	return (
		<MainContainer title="API Expoints">
			<>
				<ul>
					<li><a href="/api/hips/type">HIPS Type</a></li>
					<li><a href="/api/hips/cluster">HIPS Cluster</a></li>
					<li><a href="/api/hips/hazard">HIPS Hazard</a></li>
				</ul>
			</>
		</MainContainer >
	)
}

