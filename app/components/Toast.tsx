import React, { forwardRef, useRef, useState, useEffect } from 'react';

// types.ts
export type ToastSeverity = | 'info' | 'warn' | 'error';

export interface ToastMessage {
  severity?: ToastSeverity;
  summary?: string;
  detail?: string;
  life?: number;
  id?: number;
}

export interface ToastRef {
  show: (message: ToastMessage) => void;
  clear: () => void;
}


const Toast = forwardRef<ToastRef>((props, ref) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastContainerRef = useRef<HTMLDivElement>(null);

  const removeToast = (id?: number) => {
    if (!id) return;
    setToasts((prev) => prev.filter(t => t.id !== id));
  };

  // Expose the show method via ref
  React.useImperativeHandle(ref, () => ({
    show: (toast: ToastMessage) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { ...toast, id }]);
      
      // Auto remove after some time (default 3000ms)
      const life = toast.life || 3000;
      setTimeout(() => {
        removeToast(id);
      }, life);
    },
    clear: () => setToasts([])
  }));

  return (
    <div className="toast-container" ref={toastContainerRef}>
      {toasts.map((toast) => (
        <ToastMessage 
          key={toast.id} 
          severity={toast.severity || 'info'}
          summary={toast.summary}
          detail={toast.detail}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
});

interface ToastMessageProps {
  severity: ToastSeverity;
  summary?: string;
  detail?: string;
  onRemove: () => void;
}

const ToastMessage: React.FC<ToastMessageProps> = ({ 
  severity, 
  summary, 
  detail,
  onRemove
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger the show animation
    setIsVisible(true);

    // Set up removal timeout like designer's script
    const timer1 = setTimeout(() => {
      setIsRemoving(true);
    }, 2500); // Start removal slightly before the 15s mark

    const timer2 = setTimeout(() => {
      onRemove();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onRemove]);

  const getSeverityClass = (): string => {
    return `dts-alert--${severity}`;
  };

  const getIconPath = (): string => {
    return `assets/icons/${severity}.svg#${severity}`;
  };

  return (
    <div 
      ref={toastRef}
      className={`dts-snackbar ${isVisible ? 'show' : ''} ${isRemoving ? 'removing' : ''}`}
    >
      <div 
        ref={alertRef}
        className={`dts-alert ${getSeverityClass()}`}
      >
        <div className="dts-alert__icon">
          <svg aria-hidden="true" focusable="false" role="img">
            <use href={getIconPath()}></use>
          </svg>
        </div>
        <span>{detail || summary}</span>
      </div>
    </div>
  );
};

Toast.displayName = 'Toast';
export default Toast;