export type IconId = "undp/calendar" | "undp/hamburger" | "undp/chevron-down" | "other/settings" | "other/about" | "other/analysis" | "other/data" | "other/user-profile";

interface IconProps extends React.SVGProps<SVGSVGElement> {
	icon: IconId
}

export function Icon(props:IconProps) {
	switch (props.icon) {
		case "undp/calendar":
			return (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
	<path d="M17 3H21C21.2652 3 21.5196 3.10536 21.7071 3.29289C21.8946 3.48043 22 3.73478 22 4V20C22 20.2652 21.8946 20.5196 21.7071 20.7071C21.5196 20.8946 21.2652 21 21 21H3C2.73478 21 2.48043 20.8946 2.29289 20.7071C2.10536 20.5196 2 20.2652 2 20V4C2 3.73478 2.10536 3.48043 2.29289 3.29289C2.48043 3.10536 2.73478 3 3 3H7V1H9V3H15V1H17V3ZM20 11H4V19H20V11ZM15 5H9V7H7V5H4V9H20V5H17V7H15V5ZM6 13H8V15H6V13ZM11 13H13V15H11V13ZM16 13H18V15H16V13Z" fill="currentColor"/>
	</svg>
			);
		case "undp/hamburger":
			return (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
	<path d="M1 4H23" stroke="currentColor" strokeWidth="2"/>
	<path d="M1 12H23" stroke="currentColor" strokeWidth="2"/>
	<path d="M1 20H23" stroke="currentColor" strokeWidth="2"/>
	</svg>
			);
		case "undp/chevron-down":
			return (
			<svg width="20" height="13" viewBox="0 0 20 13" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
	<path d="M19 0.999969L10 11L1 0.999969" stroke="currentColor" strokeWidth="2"/>
	</svg>
			);
		case "other/settings":
			return (
				<embed src="/assets/icons/settings.svg" type="image/svg+xml" />
			);
		case "other/data":
			return (
					<embed src="/assets/icons/information_outline.svg" type="image/svg+xml" />
			);
		case "other/analysis":
			return (
					<embed src="/assets/icons/eye-show-password.svg" type="image/svg+xml" />
			);
		case "other/about":
			return (
					<embed src="/assets/icons/help-outline.svg" type="image/svg+xml" />
			);
			case "other/user-profile":
			return (
					<embed src="/assets/icons/user-profile.svg" type="image/svg+xml" />
			);
	}

}


