import {toast} from "react-toastify/unstyled";

const toastConfig = {
	position: "top-center" as const,
	autoClose: 5000,
}

export function notifyInfo(msg: string, options?: object) {
	toast.info(msg, { ...toastConfig, ...options });
}

export function notifyError(msg: string, options?: object) {
	toast.error(msg, { ...toastConfig, ...options });
}
