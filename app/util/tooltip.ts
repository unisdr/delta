import {
	computePosition,
	offset,
	flip,
	shift,
	arrow,
	Placement,
} from "@floating-ui/dom";

// Define the properties for the floating tooltip
export interface FloatingTooltipProps {
	content: string;
	target: HTMLElement;
	placement?: Placement; // Updated to use the Placement type from @floating-ui/dom
	offsetValue?: number;
	arrowSelector?: string;
}

// Function to create and manage a floating tooltip
export const createFloatingTooltip = ({
	content,
	target,
	placement = "top",
	offsetValue = 8,
	arrowSelector = ".dts-tooltip__arrow",
}: FloatingTooltipProps) => {
	const tooltip = document.createElement("div");
	tooltip.setAttribute("role", "tooltip");
	tooltip.className = "dts-tooltip";
	tooltip.textContent = content;

	// Optional arrow element within the tooltip
	const arrowElement = document.createElement("div");
	arrowElement.className = arrowSelector.replace(".", "");
	tooltip.appendChild(arrowElement);

	document.body.appendChild(tooltip);

	const updateTooltipPosition = async () => {
		try {
			const result = await computePosition(target, tooltip, {
				placement,
				middleware: [
					offset(offsetValue),
					flip(),
					shift({ padding: 5 }),
					arrow({ element: arrowElement }),
				],
			});

			const { x, y, middlewareData } = result;

			Object.assign(tooltip.style, {
				left: `${x}px`,
				top: `${y}px`,
				position: "absolute",
				display: "block",
			});

			// Adjust the arrow based on computed data
			if (middlewareData?.arrow) {
				const { x: arrowX, y: arrowY } = middlewareData.arrow;
				const staticSide = {
					top: "bottom",
					right: "left",
					bottom: "top",
					left: "right",
				}[result.placement.split("-")[0]] as keyof CSSStyleDeclaration;

				Object.assign(arrowElement.style, {
					left: arrowX !== null ? `${arrowX}px` : "",
					top: arrowY !== null ? `${arrowY}px` : "",
					[staticSide]: "-4px",
				});
			}
		} catch (error) {
			console.error("Failed to update tooltip position:", error);
		}
	};

	const showTooltip = () => {
		tooltip.style.display = "block";
		updateTooltipPosition();
	};

	const hideTooltip = () => {
		tooltip.style.display = "none";
	};

	// Event listeners for showing and hiding the tooltip
	["pointerenter", "focus"].forEach((event) =>
		target.addEventListener(event, showTooltip)
	);
	["pointerleave", "blur"].forEach((event) =>
		target.addEventListener(event, hideTooltip)
	);

	// Clean up the tooltip when the target element is removed
	target.addEventListener("mouseleave", () => {
		tooltip.remove();
	});
};

// Function to set up tooltips for all buttons with a specific class
export const setupTooltips = (buttonSelector: string) => {
	const buttons = document.querySelectorAll<HTMLButtonElement>(buttonSelector);

	buttons.forEach((button) => {
		const tooltipContent = button.getAttribute("data-tooltip-content");
		if (tooltipContent) {
			const tooltip = button.nextElementSibling as HTMLElement | null;
			const arrowElement = tooltip?.querySelector<HTMLElement>(
				".dts-tooltip__arrow"
			);

			if (!tooltip || !arrowElement) {
				console.error("Tooltip or arrow element not found for button", button);
				return;
			}

			const updateTooltipPosition = async () => {
				try {
					const result = await computePosition(button, tooltip, {
						placement: "top",
						middleware: [
							offset(6),
							flip(),
							shift({ padding: 5 }),
							arrow({ element: arrowElement }),
						],
					});

					const { x, y, middlewareData } = result;

					Object.assign(tooltip.style, {
						left: `${x}px`,
						top: `${y}px`,
						position: "absolute",
						display: "block",
					});

					// Adjust the arrow based on computed data
					if (middlewareData?.arrow) {
						const { x: arrowX, y: arrowY } = middlewareData.arrow;
						const staticSide = {
							top: "bottom",
							right: "left",
							bottom: "top",
							left: "right",
						}[result.placement.split("-")[0]] as keyof CSSStyleDeclaration;

						Object.assign(arrowElement.style, {
							left: arrowX !== null ? `${arrowX}px` : "",
							top: arrowY !== null ? `${arrowY}px` : "",
							[staticSide]: "-4px",
						});
					}
				} catch (error) {
					console.error("Failed to update tooltip position:", error);
				}
			};

			const showTooltip = () => {
				tooltip.style.display = "block";
				updateTooltipPosition();
			};

			const hideTooltip = () => {
				tooltip.style.display = "none";
			};

			["pointerenter", "focus"].forEach((event) =>
				button.addEventListener(event, showTooltip)
			);
			["pointerleave", "blur"].forEach((event) =>
				button.addEventListener(event, hideTooltip)
			);

			// Initial setup for the tooltip
			createFloatingTooltip({
				content: tooltipContent,
				target: button,
				arrowSelector: ".dts-tooltip__arrow",
			});
		}
	});
};
