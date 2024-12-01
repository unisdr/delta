export function formStringData(formData: FormData){
	let res: Record<string, string> = {};
	for (const [key, value] of formData.entries()) {
  	if (typeof value === "string") {
    	res[key] = value;
  	}
	}
	return res
}

