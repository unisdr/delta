interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  className?: string;
  style?: React.CSSProperties;
}

// Configuration object for better maintainability
const ALERT_CONFIG = {
  error: {
    className: 'dts-alert dts-alert--error',
    label: 'Error',
    icon: (
      <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    )
  },
  warning: {
    className: 'dts-alert dts-alert--warning',
    label: 'Warning',
    icon: (
      <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    )
  },
  info: {
    className: 'dts-alert dts-alert--info',
    label: 'Info',
    icon: (
      <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
    )
  }
} as const;

export function ErrorMessage({
  message,
  type = 'error',
  className = '',
  style = {}
}: ErrorMessageProps) {
  const { className: alertClass, icon, label } = ALERT_CONFIG[type];

  return (
    <div className={`${alertClass} ${className}`} style={style} role="alert">
      <div className="dts-alert__icon">
        {icon}
      </div>
      <span className="dts-body-text">
        <span className="mg-u-sr-only">{label}: </span>
        {message}
      </span>
    </div>
  );
}