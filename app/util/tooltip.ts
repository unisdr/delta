import { computePosition, offset, flip, shift } from "@floating-ui/dom";

export interface FloatingTooltipProps {
  content: string;
  target: HTMLElement;
}

export const createFloatingTooltip = ({
  content,
  target,
}: FloatingTooltipProps) => {
  const tooltip = document.createElement("div");
  tooltip.setAttribute("role", "tooltip");
  tooltip.className = "dts-tooltip";
  tooltip.textContent = content;

  document.body.appendChild(tooltip);

  computePosition(target, tooltip, {
    middleware: [offset(8), flip(), shift()],
  }).then(({ x, y }) => {
    Object.assign(tooltip.style, {
      left: `${x}px`,
      top: `${y}px`,
      position: "absolute",
      display: "block",
    });
  });

  target.addEventListener("mouseleave", () => {
    tooltip.remove();
  });
};
