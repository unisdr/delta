import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface ToastMessage {
  severity?: "info" | "warning" | "error";
  summary?: string;
  detail?: string;
}

export interface ToastRef {
  show: (message: Partial<ToastMessage>) => void;
}

export const Toast = forwardRef<ToastRef, {}>((props, ref) => {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    show: (msg: Partial<ToastMessage>) => {
      setMessage({
        severity: msg.severity ?? "info",
        summary: msg.summary ?? "",
        detail: msg.detail ?? "",
      });
      setIsVisible(true);
    },
  }));

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!message) return null;

  return (
    <div
      id="OTPsnackbar"
      className={`dts-snackbar ${isVisible ? "show" : ""}`}
    >
      <div className={`dts-alert dts-alert--${message.severity}`}>
        <div className="dts-alert__icon">
          <svg aria-hidden="true" focusable="false" role="img">
            <use href={`assets/icons/${message.severity}.svg#${message.severity}`} />
          </svg>
        </div>
        <span>{message.detail}</span>
      </div>
    </div>
  );
});

Toast.displayName = "Toast";