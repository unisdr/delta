interface HipHazardModel {
	hipType?: {nameEn: string } | null
	hipCluster?: {nameEn: string } | null
	hipHazard?: {nameEn: string } | null
}

export function HipHazardInfo({model}: {model: HipHazardModel}) {
	return (<div>
		{model.hipType &&
			<p>Type: {model.hipType.nameEn}</p>
		}
		{model.hipCluster &&
			<p>Cluster: {model.hipCluster.nameEn}</p>
		}
		{model.hipHazard &&
			<>
				<p>Hazard Name: {model.hipHazard.nameEn}</p>
			</>
		}
	</div>)
}
