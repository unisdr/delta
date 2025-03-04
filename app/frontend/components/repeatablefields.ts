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
	let sel = ".repeatable-add-" + g + "-" + index
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
	let maxIndex = new Map<string, number>()
	for (let def of opts.defs) {
		if (!def.repeatable) continue
		let g = def.repeatable.group
		let index = def.repeatable.index
		let c = maxIndex.get(g)
		if (!c || index > c) {
			maxIndex.set(g, index)
		}
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
			let curButton = getAddButton(elRoot, g, index)
			//console.log("processing button", index)
			if (curButton) {
				curButton.style.display = "none"
			}

			if (index == 0) {
				//	console.log("index 0")
				continue
			}
			let prevButton = getAddButton(elRoot, g, index - 1)
			if (!prevButton) {
				//	console.log("no prev button")
				continue
			}
			let mi = maxIndex.get(g)!
			//console.log("repetable debug", maxVis, index, mi)
			if (maxVis == (index - 1) && index != mi + 1) {
				prevButton.style.display = "block"
			}
			//console.log("attaching click event to button", index - 1)
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
				if (index != mi) {
					let nextAdd = getAddButton(elRoot, g, index)
					if (nextAdd) nextAdd.style.display = "block"
				}
			})
		}
	}
}

export function detach(opts: repeatableFieldsOpts) {
}


