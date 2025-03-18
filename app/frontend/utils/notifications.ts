import {toast} from "react-toastify/unstyled";


const toastConfig = {
	position: "top-center" as const,
	autoClose: 5000,
}

export function notifyInfo(msg: string) {
	toast.info(msg, toastConfig)
}

export function notifyError(msg: string) {
	toast.error(msg, toastConfig)
}
