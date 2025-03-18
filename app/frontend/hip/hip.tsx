interface HipHazardModel {
	hipType?: {nameEn: string} | null
	hipCluster?: {nameEn: string} | null
	hipHazard?: {nameEn: string} | null
}

export function HipHazardInfo({model}: {model: HipHazardModel}) {
	if (!model.hipType && !model.hipCluster && !model.hipHazard) {
		return null
	}
	return (<div>
		<h5>Hazard classification</h5>
		<ul>
			{model.hipType &&
				<li>Type: {model.hipType.nameEn}</li>
			}
			{model.hipCluster &&
				<li>Cluster: {model.hipCluster.nameEn}</li>
			}
			{model.hipHazard &&
				<li>Hazard Name: {model.hipHazard.nameEn}</li>
			}
		</ul>
	</div>)
}
