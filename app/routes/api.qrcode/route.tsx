import QRCode from "qrcode";

import {
	authLoaderAllowNoTotp,
} from "~/util/auth";

export const loader = authLoaderAllowNoTotp(async (loaderArgs) => {
	const {request} = loaderArgs;
	const url = new URL(request.url);
	const text = url.searchParams.get("text") || "Example text";

	const qrCodeDataUrl = await QRCode.toDataURL(text);
	const imageData = qrCodeDataUrl.split(",")[1];

	const imgBuffer = Buffer.from(imageData, "base64");

	return new Response(imgBuffer, {
		headers: {
			"Content-Type": "image/png",
			"Content-Length": imgBuffer.length.toString(),
		},
	});
});


