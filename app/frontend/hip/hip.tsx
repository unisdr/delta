interface HipHazardModel {
	hipClass?: {nameEn: string } | null
	hipCluster?: {nameEn: string } | null
	hipHazard?: {nameEn: string } | null
}

export function HipHazardInfo({model}: {model: HipHazardModel}) {
	return (<div>
		{model.hipClass &&
			<p>Class: {model.hipClass.nameEn}</p>
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
