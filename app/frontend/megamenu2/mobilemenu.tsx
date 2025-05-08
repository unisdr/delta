import {useState} from "react";
import {MegaMenuProps, Lvl1Item, Lvl2Item, Lvl3Item, Lvl4Item} from "./common"

import { Icon } from "~/frontend/icons/undp-icon-set/icons";

export function MobileMenu({ items }: MegaMenuProps) {
	const [isOpen, setIsOpen] = useState(false);

		const handleClick = () => {
			setIsOpen(!isOpen);
	};

	return (
		<div className="dts-mobilemenu">
			<button className="button-link" onClick={handleClick} aria-label="Toggle navigation">
				<Icon icon="undp/hamburger" />
			</button>
			{!isOpen ? 
				null :
				<Lvl1 items={items} />
			}
		</div>
	);
}

interface Lvl1Props {
	items: Lvl1Item[]; 
}

export function Lvl1({items}: Lvl1Props){
	const [index, setIndex] = useState<null | number>(null);

	const handleClick = (i:number) => {
		if (index === i) {
			setIndex(null);
		} else {
			setIndex(i);
		}
	};

	return (
		<div className="dts-mobilemenu-lvl dts-mobilemenu-lvl1">
		<ul>
			{items.map((item, i) => (
				<li key={i} className={`${item.lvl2 && i === index ? "selected" : ""}`}>
					{item.link ? (
						<a onClick={() => handleClick(i)} href="#">
							{item.icon && (
								<Icon icon={item.icon} />
							)}
							{item.name}
						</a>
					) : (
						<button onClick={() => handleClick(i)} className="button-link">
							{item.icon && (
								<Icon icon={item.icon} />
							)}
							{item.name}
							<Icon className="dts-mobilemenu-expand-icon" icon="undp/chevron-down" />
						</button>
					)}
					{item.lvl2 && i === index && (
						<>
							<Lvl2 items={item.lvl2} title={item.title || ""} />
						</>
					)}
				</li>
			))}
		</ul>
		</div>
	);
}

interface Lvl2Props {
	items: Lvl2Item[]; 
	title: string
}


export function Lvl2({items}: Lvl2Props){
	const [index, setIndex] = useState<null | number>(null);

	const handleClick = (i:number) => {
		if (index === i) {
			setIndex(null);
		} else {
			setIndex(i);
		}
	};

	return (
		<div className="dts-mobilemenu-lvl dts-mobilemenu-lvl2">
		<ul>
			{items.map((item, i) => (
				<li key={i} className={`${item.lvl3 && i === index ? "selected" : ""}`}>

					<button onClick={() => handleClick(i)} className="button-link">
						{item.name}
						<Icon className="dts-mobilemenu-expand-icon" icon="undp/chevron-down" />
					</button>
					{item.lvl3 && i === index && (
						<>
							<Lvl3 items={item.lvl3} />
						</>
					)}
				</li>
			))}
		</ul>
		</div>
	);
}

interface Lvl3Props {
	items: Lvl3Item[]; 
}

export function Lvl3({items}: Lvl3Props){
	const [index, setIndex] = useState<null | number>(null);

	const handleClick = (i:number) => {
		if (index === i) {
			setIndex(null);
		} else {
			setIndex(i);
		}
	};

	return (
		<div className="dts-mobilemenu-lvl dts-mobilemenu-lvl3">
		<ul>
			{items.map((item, i) => (
				<li key={i} className={`${item.lvl4 && i === index ? "selected" : ""}`}>
					<button onClick={() => handleClick(i)} className="button-link">
						{item.title}
						<Icon className="dts-mobilemenu-expand-icon" icon="undp/chevron-down" />
					</button>
					{item.lvl4 && i === index && (
						<>
							<Lvl4 items={item.lvl4} />
						</>
					)}
				</li>
			))}
		</ul>
		</div>
	);
}

interface Lvl4Props {
	items: Lvl4Item[]; 
}

export function Lvl4({items}: Lvl4Props){
	return (
	<div className="dts-mobilemenu-lvl dts-mobilemenu-lvl4">
	<ul>
		{items.map((item, index) => (
			<li key={index}>
				<a href={item.link}>
					{item.icon && (
						<Icon icon={item.icon} />
					)}
					{item.name}
				</a>
			</li>
		))}
	</ul>
	</div>
	);
}

