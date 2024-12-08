import {IconId} from "../icons/undp-icon-set/icons";

export interface Lvl1Item {
	name: string;
	title?: string;
	icon?: IconId;
	link?: string;
	lvl2?: Lvl2Item[];
}

export interface Lvl2Item {
	name: string;
	id: string;
	lvl3: Lvl3Item[];
}

export interface Lvl3Item {
	title: string;
	lvl4: Lvl4Item[];
}

export interface Lvl4Item {
	name: string;
	link: string;
}

export interface MegaMenuProps {
	items: Lvl1Item[];
}
