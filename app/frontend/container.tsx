import React from "react";

interface MainContainerProps {
	title: string;
	children: React.ReactNode;
	headerExtra?: React.ReactNode;
	headerAfter?: React.ReactNode;
}

export function MainContainer(props: MainContainerProps) {
	return (
		<div className="dts-main-container">
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">{props.title}</h1>
					</div>
				</header>
				{props.headerExtra}
			</div>
			{props.headerAfter}
				<div className="mg-container">
					{props.children}
				</div>
		</div>
	);
}



