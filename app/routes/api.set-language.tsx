import { type ActionFunctionArgs } from "@remix-run/node";
import { setDirectionInSession, setLanguageInSession } from "~/util/session";

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const lng = formData.get("lng") as string;

	// Validate language
	const supportedLanguages = ['en', 'ar', 'ru'];
	if (!supportedLanguages.includes(lng)) {
		return Response.json({ success: false, error: "Invalid language" }, { status: 400 });
	}

	// Determine direction based on language
	const direction = lng === 'ar' ? 'rtl' : 'ltr';

	// Set language in session
	await setLanguageInSession(request, lng);
	
	// Set direction in session
	const directionHeaders = await setDirectionInSession(request, direction);

	// Use the direction headers (the last one set)
	return Response.json(
		{ success: true, language: lng, direction },
		{ headers: directionHeaders }
	);
}