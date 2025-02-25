export interface handleOverridesOpts {
	formRef: any
	prefix: string
	partsNames: string[]
	resName: string
	calc: (parts: number[]) => number
}

function getEl(opts: handleOverridesOpts, field: string): HTMLFormElement {
	let f = opts.formRef.current!.querySelector('[name="' + opts.prefix + field + '"]') as HTMLFormElement
	return f
}

function getCheckbox(opts: handleOverridesOpts, field: string): HTMLFormElement {
	let f = opts.formRef.current!.querySelector('[name="' + opts.prefix + field + '"][type=checkbox]') as HTMLFormElement
	return f
}


export function attach(opts: handleOverridesOpts) {
	if (!opts.formRef.current) return
	update(opts)
	let els = [
		getCheckbox(opts, opts.resName + "Override"),
	]
	for (let part of opts.partsNames) {
		els.push(getEl(opts, part))
	}
	els.forEach(el => {
		el.addEventListener('input', () => {
			update(opts)
		})
	})
}

function update(opts: handleOverridesOpts) {
	if (!opts.formRef.current) return

	let values: number[] = []
	for (let part of opts.partsNames) {
		let el = getEl(opts, part)
		if (!el){
			throw new Error("element to use as source data for calc not found: " + part)
		}
		let s = el.value
		let n = Number(s)
		values.push(n)
	}
	let rn = opts.calc(values)
	let r = ""
	if (!isNaN(rn)){
		r = String(rn)
	}
	let checkbox = getCheckbox(opts, opts.resName + "Override")
	let el = getEl(opts, opts.resName)
	if (!el){
		throw new Error("checkbox not found for: " + opts.resName)
	}
	console.log("override check", opts.prefix, "checkbox", checkbox.checked)
	if (!checkbox.checked) {
		el.value = r
		// trigger if this result is using as input for another override
		// used in damages form
		el.dispatchEvent(new Event('input', { bubbles: false }))
		el.disabled = true
	} else {
		el.disabled = false
	}
}

export function detach(opts: handleOverridesOpts) {
	let els = [
		getEl(opts, "CostUnit"),
		getEl(opts, "Units"),
		getCheckbox(opts, opts.resName + "Override"),
	]
	els.forEach(_el => {
		//el.removeEventListener('change', todo)
	})
}

