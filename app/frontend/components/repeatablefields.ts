export interface repeatableFieldsOpts {
	inputsRef: any
	defs: any
}

function setInputVisibility(elRoot: HTMLDivElement, name: string, visible: boolean) {
	let el = elRoot.querySelector("[name=" + name + "]") as HTMLInputElement
	let parent = el.closest(".dts-form-component")! as HTMLDivElement
	if (visible) {
		parent.style.display = "grid"
	} else {
		parent.style.display = "none"
	}
	let labelEl = elRoot.querySelector(".row-header-" + name) as HTMLElement
	if (!labelEl) return
	if (visible) {
		labelEl.style.display = "inline"
	} else {
		labelEl.style.display = "none"
	}
}

function getAddButton(elRoot: HTMLDivElement, g: string, index: number) {
	if (index == 0) {
		return null
	}
	let sel = ".repeatable-add-" + g + "-" + (index - 1)
	let prevButton = elRoot.querySelector(sel) as HTMLButtonElement
	return prevButton
}


export function attach(opts: repeatableFieldsOpts) {
	if (!opts.inputsRef || !opts.inputsRef.current) return
	let elRoot = opts.inputsRef.current as HTMLDivElement
	let groupVisible = new Map<string, Set<number>>()
	for (let def of opts.defs) {
		if (!def.repeatable) continue
		let g = def.repeatable.group
		let index = def.repeatable.index
		let el = elRoot.querySelector("[name=" + def.key + "]") as HTMLInputElement
		let v = el.value
		let curr = groupVisible.get(g) || new Set()
		if (v !== "") {
			curr.add(index)
		}
		groupVisible.set(g, curr)
	}
	for (let [g, vis] of groupVisible.entries()) {
		let maxVis = 0
		if (vis.size) {
			maxVis = Math.max(...vis)
		}
		for (let def of opts.defs) {
			if (!def.repeatable) continue
			if (g != def.repeatable.group) continue
			let index = def.repeatable.index
			let visible = index <= maxVis
			setInputVisibility(elRoot, def.key, visible)

			if (index == 0) continue
			let prevButton = getAddButton(elRoot, g, index)
			if (!prevButton) {
				continue
			}
			if (maxVis + 1 != index) {
				prevButton.style.display = "none"
			}
			prevButton.addEventListener("click", (e: any) => {
				e.preventDefault()
				prevButton!.style.display = "none"
				for (let def of opts.defs) {
					if (!def.repeatable) continue
					let g2 = def.repeatable.group
					let index2 = def.repeatable.index
					if (g2 == g && index2 == index) {
						setInputVisibility(elRoot, def.key, true)
					}
				}
				let nextAdd = getAddButton(elRoot, g, index + 1)
				if (nextAdd) nextAdd.style.display = "block"
			})
		}
	}
}

export function detach(opts: repeatableFieldsOpts) {
}


