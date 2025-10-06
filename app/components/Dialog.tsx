import { useEffect, useRef } from "react";

interface DialogProps {
	visible: boolean;
	onClose?: () => void;
	header?: string;
	children?: React.ReactNode;
	footer?: React.ReactNode;
}

function Dialog({ visible, onClose, header, children, footer }: DialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (visible) {
			dialog.showModal();
		} else {
			dialog.close();
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && visible) {
				if (onClose) {
					onClose();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [visible, onClose]);

	const handleClose = () => {
		if (onClose) {
			onClose();
		}
	};

	return (
		<dialog ref={dialogRef} className="dts-dialog">
			<div className="dts-dialog__content">
				<div className="dts-dialog__header" style={{  fill: "red" }}>
					<h2 className="dts-heading-2">{header}</h2>
					<button
						type="button"
						autoFocus
						onClick={handleClose}
						aria-label="Close Dialog"
						className="dts-dialog-close-button"
					>
						<svg
							aria-hidden="true"
							focusable="false"
							role="img"
							className="dts-svg-24"
						>
							<use href="/assets/icons/close.svg#close" />
						</svg>
					</button>
				</div>
			</div>

			<div className="dts-form__body">{children}</div>

			<div className="dts-form__actions">{footer}</div>
			::backdrop
		</dialog>
	);
}

export default Dialog;
