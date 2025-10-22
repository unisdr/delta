import { useEffect, useState } from "react";
import {MegaMenuProps, Lvl1Item, Lvl2Item, Lvl3Item, Lvl4Item} from "./common"
import { MobileMenu } from "./mobilemenu"

import { Icon } from "~/frontend/icons/undp-icon-set/icons";
import { Link } from "@remix-run/react";


export function MegaMenu({ items }: MegaMenuProps) {
	const [isClient, setIsClient] = useState(false);

	const [windowWidth, setWindowWidth] = useState(
		typeof window !== "undefined" ? window.innerWidth : 0
	);

	useEffect(() => {
		setIsClient(true);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleResize = () => setWindowWidth(window.innerWidth);
		window.addEventListener("resize", handleResize);
		handleResize();
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	if (isClient && windowWidth < 768){
		return <MobileMenu items={items} />
	}
	return (
		 <div className={`dts-megamenu ${isClient ? "js-enabled" : ""}`}>
			<Link className="open-menu" to="#dts-main-header-open">
				Open
			</Link>
			<Lvl1 items={items} />
		</div>
	);
}

interface Lvl1Props {
	items: Lvl1Item[]; 
}

export function Lvl1({items}: Lvl1Props){
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	let timeoutId: any;

	const handleMouseEnter = (index:number) => {
		clearTimeout(timeoutId);
		setSelectedIndex(index);
	};

	const handleMouseLeave = () => {
		timeoutId = setTimeout(() => {
			setSelectedIndex(null);
		}, 250);
	};

	return (
		<div className="dts-megamenu-lvl1">
		<ul>
			{items.map((item, i) => (
				<li key={i}
					className={selectedIndex === i ? "selected" : ""}
					onMouseEnter={() => handleMouseEnter(i)}
					onMouseLeave={handleMouseLeave}
					>
					{item.link ? (
						<Link to={item.link}>
							{item.icon && <Icon icon={item.icon} />}
							{item.name}
						</Link>
					) : (
						<button className="button-link">
							{item.icon && (
								<Icon icon={item.icon} />
							)}
							{item.name}
						</button>
					)}
					{item.lvl2 && (
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

export function Lvl2({items, title}: Lvl2Props){
	const [selectedId, setSelectedId] = useState<null|string>(null);

	useEffect(() => {
		setSelectedId(items[0].id);
	}, []);

	const handleMouseEnter = (id: string) => {
		setSelectedId(id);
	};

	return (
		<div className="dts-megamenu-lvl2">
			<div className="title">{title}</div>
			<div className="cols">
			<div className="col1">
				<ul>
					{items.map((item, i) => (
						<li key={i}
							onMouseEnter={() => handleMouseEnter(item.id)}
							className={selectedId === item.id ? "selected" : ""}
							>
							<Link onClick={(e) => e.preventDefault()} to={"#" + item.id}>
  								{item.name}
							</Link>
						</li>
					))}
				</ul>
			</div>
			<div className="col2">
			<ul>
				{items.map((item, i) => (
					<li id={item.id} key={i} className={selectedId === item.id ? "selected" : ""}>
						{item.lvl3 && (
							<Lvl3 items={item.lvl3} />
						)}
					</li>
				))}
			</ul>
			</div>
			</div>
		</div>
	);
}

interface Lvl3Props {
	items: Lvl3Item[]; 
}

export function Lvl3({items}: Lvl3Props){
	return (
		<ul className="dts-megamenu-lvl3">
			{items.map((item, index) => (
				<li key={index}>
					<span>{item.title}</span>
					{item.lvl4 && (
						<Lvl4 items={item.lvl4} />
					)}
				</li>
			))}
		</ul>
	);
}

interface Lvl4Props {
	items: Lvl4Item[]; 
}

export function Lvl4({items}: Lvl4Props){
	return (
	<ul className="dts-megamenu-lvl4">
		{items.map((item, index) => (
			<li key={index}>
				<Link to={item.link}>{item.name}</Link>
			</li>
		))}
	</ul>
	);
}

