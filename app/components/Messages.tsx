interface MessagesProps {
	header?: string;
	messages?: string[];
	children?: React.ReactNode;
}

function Messages({ header, messages, children }: MessagesProps) {
	return (
		<div className="dts-alert dts-alert--error">
			<div className="dts-alert__icon">
				<svg aria-hidden="true" focusable="false" role="img">
					<use href="assets/icons/error.svg#error"></use>
				</svg>
			</div>
			<div className="dts-alert__content">
				<h4 className="dts-alert__heading">{header}</h4>
				{children ? (
					children
				) : (
					<ul className="dts-alert__list">
						{messages &&
							messages.map((message, index) => <li key={index}>{message}</li>)}
					</ul>
				)}
			</div>
		</div>
	);
}

export default Messages;
