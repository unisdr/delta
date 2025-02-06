import {
	computePosition,
	offset,
	flip,
	shift,
	arrow,
	Placement,
} from "@floating-ui/dom";

export interface FloatingTooltipProps {
	content: string;
	target: HTMLElement;
	placement?: Placement;
	offsetValue?: number;
	arrowSelector?: string;
}

export const createFloatingTooltip = ({
	content,
	target,
	placement = "top",
	offsetValue = 8,
	arrowSelector = ".dts-tooltip__arrow",
}: FloatingTooltipProps): void => {
	if (typeof document === "undefined") return; // SSR safety check

	const tooltip = document.createElement("div");
	tooltip.setAttribute("role", "tooltip");
	tooltip.className = "dts-tooltip";
	tooltip.textContent = content;

	const arrowElement = document.createElement("div");
	arrowElement.className = arrowSelector.replace(".", "");
	tooltip.appendChild(arrowElement);
	document.body.appendChild(tooltip);

	const updateTooltipPosition = async (): Promise<void> => {
		const result = await computePosition(target, tooltip, {
			placement,
			middleware: [
				offset(offsetValue),
				flip(),
				shift({ padding: 5 }),
				arrow({ element: arrowElement }),
			],
		});

		Object.assign(tooltip.style, {
			left: `${result.x}px`,
			top: `${result.y}px`,
			position: "absolute",
			display: "block",
		});

		if (result.middlewareData?.arrow) {
			const { x, y } = result.middlewareData.arrow;
			Object.assign(arrowElement.style, {
				left: x !== null ? `${x}px` : "",
				top: y !== null ? `${y}px` : "",
				position: "absolute",
			});
		}
	};

	const showTooltip = (): void => {
		tooltip.style.display = "block";
		updateTooltipPosition();
	};

	const hideTooltip = (): void => {
		tooltip.style.display = "none";
	};

	target.addEventListener("pointerenter", showTooltip);
	target.addEventListener("pointerleave", hideTooltip);
	target.addEventListener("blur", hideTooltip);

	// Clean up the tooltip when the target element is removed
	target.addEventListener("mouseleave", () => {
		tooltip.remove();
	});
};
