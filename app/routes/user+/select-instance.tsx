import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";

export const loader = async () => {
	return (
		<MainContainer title="Select Instance" headerExtra={<NavSettings />}>
			<div>
				Select Instance
			</div>
		</MainContainer>
	);
};
