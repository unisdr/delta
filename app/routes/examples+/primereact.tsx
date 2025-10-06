// import type { MetaFunction } from "@remix-run/node";

// import { NavSettings } from "~/routes/settings/nav";
// import { MainContainer } from "~/frontend/container";
// import { loadMarkdownContent } from "~/util/loadMarkdownContent";
// import { useState } from "react";
// import {
// 	AutoComplete,
// 	AutoCompleteChangeEvent,
// 	AutoCompleteCompleteEvent,
// } from "primereact/autocomplete";
// import { Button } from "primereact/button";
// import { Dialog } from "primereact/dialog";
// import { Steps } from "primereact/steps";
// import { Tree, TreeExpandedKeysType } from "primereact/tree";
// import { TreeNode } from "primereact/treenode";
// import { Menubar } from "primereact/menubar";
// import { usePrimeTheme } from "~/hooks/usePrimeTheme";
// import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";

// export const loader = async () => {
// 	const { fullContent, appendContent } = await loadMarkdownContent("about");

// 	return Response.json({ fullContent, appendContent });
// };

// // Meta function for page SEO
// export const meta: MetaFunction = () => {
// 	return [
// 		{ title: "PrimeReact Testing Components Page - DTS" },
// 		{
// 			name: "description",
// 			content: "PrimeReact Testing Components Page - DTS",
// 		},
// 	];
// };

// // React component for About the System page
// export default function AboutTheSystem() {
// 	const { theme, setTheme } = usePrimeTheme("lara-light-blue");
// 	const themes = [
// 		// 🌈 Bootstrap
// 		{ name: "Bootstrap Light Blue", code: "bootstrap4-light-blue" },
// 		{ name: "Bootstrap Light Purple", code: "bootstrap4-light-purple" },
// 		{ name: "Bootstrap Dark Blue", code: "bootstrap4-dark-blue" },
// 		{ name: "Bootstrap Dark Purple", code: "bootstrap4-dark-purple" },

// 		// 🎨 Material Design
// 		{ name: "Material Light Indigo", code: "md-light-indigo" },
// 		{ name: "Material Light Deep Purple", code: "md-light-deeppurple" },
// 		{ name: "Material Dark Indigo", code: "md-dark-indigo" },
// 		{ name: "Material Dark Deep Purple", code: "md-dark-deeppurple" },

// 		// 🧱 Material Design Compact (MDC)
// 		{ name: "MDC Light Indigo", code: "mdc-light-indigo" },
// 		{ name: "MDC Light Deep Purple", code: "mdc-light-deeppurple" },
// 		{ name: "MDC Dark Indigo", code: "mdc-dark-indigo" },
// 		{ name: "MDC Dark Deep Purple", code: "mdc-dark-deeppurple" },

// 		// 🪶 Tailwind / Fluent
// 		{ name: "Tailwind Light", code: "tailwind-light" },
// 		{ name: "Fluent Light", code: "fluent-light" },

// 		// 🌊 Lara
// 		{ name: "Lara Light Blue", code: "lara-light-blue" },
// 		{ name: "Lara Light Indigo", code: "lara-light-indigo" },
// 		{ name: "Lara Light Purple", code: "lara-light-purple" },
// 		{ name: "Lara Light Teal", code: "lara-light-teal" },
// 		{ name: "Lara Dark Blue", code: "lara-dark-blue" },
// 		{ name: "Lara Dark Indigo", code: "lara-dark-indigo" },
// 		{ name: "Lara Dark Purple", code: "lara-dark-purple" },
// 		{ name: "Lara Dark Teal", code: "lara-dark-teal" },

// 		// 🏙️ Soho
// 		{ name: "Soho Light", code: "soho-light" },
// 		{ name: "Soho Dark", code: "soho-dark" },

// 		// 💫 Viva
// 		{ name: "Viva Light", code: "viva-light" },
// 		{ name: "Viva Dark", code: "viva-dark" },

// 		// 🌸 Mira & Nano
// 		{ name: "Mira", code: "mira" },
// 		{ name: "Nano", code: "nano" },

// 		// 🌞 Saga
// 		{ name: "Saga Blue", code: "saga-blue" },
// 		{ name: "Saga Green", code: "saga-green" },
// 		{ name: "Saga Orange", code: "saga-orange" },
// 		{ name: "Saga Purple", code: "saga-purple" },

// 		// 🌚 Vela
// 		{ name: "Vela Blue", code: "vela-blue" },
// 		{ name: "Vela Green", code: "vela-green" },
// 		{ name: "Vela Orange", code: "vela-orange" },
// 		{ name: "Vela Purple", code: "vela-purple" },

// 		// 🌑 Arya
// 		{ name: "Arya Blue", code: "arya-blue" },
// 		{ name: "Arya Green", code: "arya-green" },
// 		{ name: "Arya Orange", code: "arya-orange" },
// 		{ name: "Arya Purple", code: "arya-purple" },
// 	];

// 	const Menuitems = [
// 		{
// 			label: "Home",
// 			icon: "pi pi-home",
// 		},
// 		{
// 			label: "Features",
// 			icon: "pi pi-star",
// 		},
// 		{
// 			label: "Projects",
// 			icon: "pi pi-search",
// 			items: [
// 				{
// 					label: "Components",
// 					icon: "pi pi-bolt",
// 				},
// 				{
// 					label: "Blocks",
// 					icon: "pi pi-server",
// 				},
// 				{
// 					label: "UI Kit",
// 					icon: "pi pi-pencil",
// 				},
// 				{
// 					label: "Templates",
// 					icon: "pi pi-palette",
// 					items: [
// 						{
// 							label: "Apollo",
// 							icon: "pi pi-palette",
// 						},
// 						{
// 							label: "Ultima",
// 							icon: "pi pi-palette",
// 						},
// 					],
// 				},
// 			],
// 		},
// 		{
// 			label: "Contact",
// 			icon: "pi pi-envelope",
// 		},
// 	];

// 	const [value, setValue] = useState<string>("");
// 	const [items, setItems] = useState<string[]>([]);

// 	const search = (event: AutoCompleteCompleteEvent) => {
// 		setItems([...Array(10).keys()].map((item) => event.query + "-" + item));
// 	};

// 	const [visible, setVisible] = useState<boolean>(false);
// 	const [position, setPosition] = useState<string>("center");
// 	const footerContent = (
// 		<div>
// 			<Button
// 				label="No"
// 				icon="pi pi-times"
// 				onClick={() => setVisible(false)}
// 				className="p-button-text"
// 			/>
// 			<Button
// 				label="Yes"
// 				icon="pi pi-check"
// 				onClick={() => setVisible(false)}
// 				autoFocus
// 			/>
// 		</div>
// 	);

// 	const show = (position: string) => {
// 		setPosition(position);
// 		setVisible(true);
// 	};

// 	const stepperItems = [
// 		{
// 			label: "Personal Info",
// 		},
// 		{
// 			label: "Reservation",
// 		},
// 		{
// 			label: "Review",
// 		},
// 	];
// 	const [activeIndex, setActiveIndex] = useState(0);

// 	const [nodes] = useState<TreeNode[]>([
// 		{
// 			key: "0",
// 			label: "Documents",
// 			data: "Documents Folder",
// 			icon: "pi pi-fw pi-inbox",
// 			children: [
// 				{
// 					key: "0-0",
// 					label: "Work",
// 					data: "Work Folder",
// 					icon: "pi pi-fw pi-cog",
// 					children: [
// 						{
// 							key: "0-0-0",
// 							label: "Expenses.doc",
// 							icon: "pi pi-fw pi-file",
// 							data: "Expenses Document",
// 						},
// 						{
// 							key: "0-0-1",
// 							label: "Resume.doc",
// 							icon: "pi pi-fw pi-file",
// 							data: "Resume Document",
// 						},
// 					],
// 				},
// 				{
// 					key: "0-1",
// 					label: "Home",
// 					data: "Home Folder",
// 					icon: "pi pi-fw pi-home",
// 					children: [
// 						{
// 							key: "0-1-0",
// 							label: "Invoices.txt",
// 							icon: "pi pi-fw pi-file",
// 							data: "Invoices for this month",
// 						},
// 					],
// 				},
// 			],
// 		},
// 	]);
// 	const [expandedKeys, setExpandedKeys] = useState<TreeExpandedKeysType>({
// 		"0": true,
// 		"0-0": true,
// 	});

// 	const expandAll = () => {
// 		let _expandedKeys = {};

// 		for (let node of nodes) {
// 			expandNode(node, _expandedKeys);
// 		}

// 		setExpandedKeys(_expandedKeys);
// 	};

// 	const collapseAll = () => {
// 		setExpandedKeys({});
// 	};

// 	const expandNode = (node: TreeNode, _expandedKeys: TreeExpandedKeysType) => {
// 		if (node.children && node.children.length) {
// 			_expandedKeys[node.key as string] = true;

// 			for (let child of node.children) {
// 				expandNode(child, _expandedKeys);
// 			}
// 		}
// 	};

// 	return (
// 		<MainContainer
// 			title="PrimeReact Testing Components Page"
// 			headerExtra={<NavSettings />}
// 		>
// 			<div className="card mb-4">
// 				<Menubar model={Menuitems} />
// 			</div>

// 			<div className="card flex justify-content-center mb-4">
// 				<Dropdown
// 					defaultValue={theme}
// 					onChange={(e: DropdownChangeEvent) => 
// 						setTheme(e.target.value.code)
// 					}
// 					options={themes}
// 					optionLabel="name"
// 					placeholder="Select a Theme"
// 					className="w-full md:w-14rem"
// 				/>
// 			</div>

// 			<div className="card">
// 				<div className=" flex justify-content-center mb-4">
// 					<AutoComplete
// 						value={value}
// 						suggestions={items}
// 						completeMethod={search}
// 						onChange={(e: AutoCompleteChangeEvent) => setValue(e.value)}
// 						dropdown
// 						forceSelection 
// 					/>
// 				</div>

// 				<div className="card flex flex-wrap justify-content-center gap-3 mb-4">
// 					<Button label="Primary" raised />
// 					<Button label="Secondary" severity="secondary" raised />
// 					<Button label="Success" severity="success" raised />
// 					<Button label="Info" severity="info" raised />
// 					<Button label="Warning" severity="warning" raised />
// 					<Button label="Help" severity="help" raised />
// 					<Button label="Danger" severity="danger" raised />
// 				</div>

// 				<div className="flex flex-wrap justify-content-center gap-3 mb-4">
// 					<Button label="Primary" outlined />
// 					<Button label="Secondary" severity="secondary" outlined />
// 					<Button label="Success" severity="success" outlined />
// 					<Button label="Info" severity="info" outlined />
// 					<Button label="Warning" severity="warning" outlined />
// 					<Button label="Help" severity="help" outlined />
// 					<Button label="Danger" severity="danger" outlined />
// 				</div>

// 				<div className="flex flex-wrap justify-content-center gap-3 mb-4">
// 					<Button icon="pi pi-check" aria-label="Filter" />
// 					<Button
// 						icon="pi pi-bookmark"
// 						severity="secondary"
// 						aria-label="Bookmark"
// 					/>
// 					<Button icon="pi pi-search" severity="success" aria-label="Search" />
// 					<Button icon="pi pi-user" severity="info" aria-label="User" />
// 					<Button
// 						icon="pi pi-bell"
// 						severity="warning"
// 						aria-label="Notification"
// 					/>
// 					<Button icon="pi pi-heart" severity="help" aria-label="Favorite" />
// 					<Button icon="pi pi-times" severity="danger" aria-label="Cancel" />
// 				</div>

// 				<div className="flex flex-wrap justify-content-center gap-3 mb-4">
// 					<Button icon="pi pi-check" rounded aria-label="Filter" />
// 					<Button
// 						icon="pi pi-bookmark"
// 						rounded
// 						severity="secondary"
// 						aria-label="Bookmark"
// 					/>
// 					<Button
// 						icon="pi pi-search"
// 						rounded
// 						severity="success"
// 						aria-label="Search"
// 					/>
// 					<Button icon="pi pi-user" rounded severity="info" aria-label="User" />
// 					<Button
// 						icon="pi pi-bell"
// 						rounded
// 						severity="warning"
// 						aria-label="Notification"
// 					/>
// 					<Button
// 						icon="pi pi-heart"
// 						rounded
// 						severity="help"
// 						aria-label="Favorite"
// 					/>
// 					<Button
// 						icon="pi pi-times"
// 						rounded
// 						severity="danger"
// 						aria-label="Cancel"
// 					/>
// 				</div>

// 				<div className="flex flex-wrap justify-content-center gap-3 mb-4">
// 					<Button icon="pi pi-check" rounded outlined aria-label="Filter" />
// 					<Button
// 						icon="pi pi-bookmark"
// 						rounded
// 						outlined
// 						severity="secondary"
// 						aria-label="Bookmark"
// 					/>
// 					<Button
// 						icon="pi pi-search"
// 						rounded
// 						outlined
// 						severity="success"
// 						aria-label="Search"
// 					/>
// 					<Button
// 						icon="pi pi-user"
// 						rounded
// 						outlined
// 						severity="info"
// 						aria-label="User"
// 					/>
// 					<Button
// 						icon="pi pi-bell"
// 						rounded
// 						outlined
// 						severity="warning"
// 						aria-label="Notification"
// 					/>
// 					<Button
// 						icon="pi pi-heart"
// 						rounded
// 						outlined
// 						severity="help"
// 						aria-label="Favorite"
// 					/>
// 					<Button
// 						icon="pi pi-times"
// 						rounded
// 						outlined
// 						severity="danger"
// 						aria-label="Cancel"
// 					/>
// 				</div>

// 				<div className="flex flex-wrap justify-content-center gap-3 mb-4">
// 					<Button icon="pi pi-check" rounded text raised aria-label="Filter" />
// 					<Button
// 						icon="pi pi-bookmark"
// 						rounded
// 						text
// 						raised
// 						severity="secondary"
// 						aria-label="Bookmark"
// 					/>
// 					<Button
// 						icon="pi pi-search"
// 						rounded
// 						text
// 						raised
// 						severity="success"
// 						aria-label="Search"
// 					/>
// 					<Button
// 						icon="pi pi-user"
// 						rounded
// 						text
// 						raised
// 						severity="info"
// 						aria-label="User"
// 					/>
// 					<Button
// 						icon="pi pi-bell"
// 						rounded
// 						text
// 						raised
// 						severity="warning"
// 						aria-label="Notification"
// 					/>
// 					<Button
// 						icon="pi pi-heart"
// 						rounded
// 						text
// 						raised
// 						severity="help"
// 						aria-label="Favorite"
// 					/>
// 					<Button
// 						icon="pi pi-times"
// 						rounded
// 						text
// 						raised
// 						severity="danger"
// 						aria-label="Cancel"
// 					/>
// 				</div>

// 				<div className="flex flex-wrap justify-content-center gap-3">
// 					<Button icon="pi pi-check" rounded text aria-label="Filter" />
// 					<Button
// 						icon="pi pi-bookmark"
// 						rounded
// 						text
// 						severity="secondary"
// 						aria-label="Bookmark"
// 					/>
// 					<Button
// 						icon="pi pi-search"
// 						rounded
// 						text
// 						severity="success"
// 						aria-label="Search"
// 					/>
// 					<Button
// 						icon="pi pi-user"
// 						rounded
// 						text
// 						severity="info"
// 						aria-label="User"
// 					/>
// 					<Button
// 						icon="pi pi-bell"
// 						rounded
// 						text
// 						severity="warning"
// 						aria-label="Notification"
// 					/>
// 					<Button
// 						icon="pi pi-heart"
// 						rounded
// 						text
// 						severity="help"
// 						aria-label="Favorite"
// 					/>
// 					<Button
// 						icon="pi pi-times"
// 						rounded
// 						text
// 						severity="danger"
// 						aria-label="Cancel"
// 					/>
// 				</div>

// 				<div className="flex flex-wrap justify-content-center gap-2 mb-2">
// 					<Button
// 						label="Left"
// 						icon="pi pi-arrow-right"
// 						onClick={() => show("left")}
// 						className="p-button-help"
// 						style={{ minWidth: "10rem" }}
// 					/>
// 					<Button
// 						label="Right"
// 						icon="pi pi-arrow-left"
// 						onClick={() => show("right")}
// 						className="p-button-help"
// 						style={{ minWidth: "10rem" }}
// 					/>
// 				</div>
// 				<div className="flex flex-wrap justify-content-center gap-2 mb-2">
// 					<Button
// 						label="TopLeft"
// 						icon="pi pi-arrow-down-right"
// 						onClick={() => show("top-left")}
// 						className="p-button-warning"
// 						style={{ minWidth: "10rem" }}
// 					/>
// 					<Button
// 						label="Top"
// 						icon="pi pi-arrow-down"
// 						onClick={() => show("top")}
// 						className="p-button-warning"
// 						style={{ minWidth: "10rem" }}
// 					/>
// 					<Button
// 						label="TopRight"
// 						icon="pi pi-arrow-down-left"
// 						onClick={() => show("top-right")}
// 						className="p-button-warning"
// 						style={{ minWidth: "10rem" }}
// 					/>
// 				</div>
// 				<div className="flex flex-wrap justify-content-center gap-2 mb-4">
// 					<Button
// 						label="BottomLeft"
// 						icon="pi pi-arrow-up-right"
// 						onClick={() => show("bottom-left")}
// 						className="p-button-success"
// 						style={{ minWidth: "10rem" }}
// 					/>
// 					<Button
// 						label="Bottom"
// 						icon="pi pi-arrow-up"
// 						onClick={() => show("bottom")}
// 						className="p-button-success"
// 						style={{ minWidth: "10rem" }}
// 					/>
// 					<Button
// 						label="BottomRight"
// 						icon="pi pi-arrow-up-left"
// 						onClick={() => show("bottom-right")}
// 						className="p-button-success"
// 						style={{ minWidth: "10rem" }}
// 					/>
// 				</div>

// 				<Dialog
// 					header="Header"
// 					visible={visible}
// 					position={position as "center"}
// 					style={{ width: "50vw" }}
// 					onHide={() => {
// 						if (!visible) return;
// 						setVisible(false);
// 					}}
// 					footer={footerContent}
// 					draggable={false}
// 					resizable={false}
// 				>
// 					<p className="m-0">
// 						Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
// 						eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
// 						ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
// 						aliquip ex ea commodo consequat. Duis aute irure dolor in
// 						reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
// 						pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
// 						culpa qui officia deserunt mollit anim id est laborum.
// 					</p>
// 				</Dialog>

// 				<div className="card mb-4">
// 					<div className="flex flex-wrap justify-content-end gap-2 mb-3">
// 						<Button
// 							outlined={activeIndex !== 0}
// 							rounded
// 							label="1"
// 							onClick={() => setActiveIndex(0)}
// 							className="w-2rem h-2rem p-0"
// 						/>
// 						<Button
// 							outlined={activeIndex !== 1}
// 							rounded
// 							label="2"
// 							onClick={() => setActiveIndex(1)}
// 							className="w-2rem h-2rem p-0"
// 						/>
// 						<Button
// 							outlined={activeIndex !== 2}
// 							rounded
// 							label="3"
// 							onClick={() => setActiveIndex(2)}
// 							className="w-2rem h-2rem p-0"
// 						/>
// 					</div>
// 					<Steps model={stepperItems} activeIndex={activeIndex} />
// 				</div>

// 				<div className="card flex flex-column align-items-center">
// 					<div className="flex flex-wrap gap-2 mb-4">
// 						<Button
// 							type="button"
// 							icon="pi pi-plus"
// 							label="Expand All"
// 							onClick={expandAll}
// 							size="small"
// 						/>
// 						<Button
// 							type="button"
// 							icon="pi pi-minus"
// 							label="Collapse All"
// 							onClick={collapseAll}
// 							size="small"
// 						/>
// 					</div>

// 					<Tree
// 						value={nodes}
// 						expandedKeys={expandedKeys}
// 						onToggle={(e) => setExpandedKeys(e.value)}
// 						className="w-full md:w-30rem"
// 					/>
// 				</div>
// 			</div>
// 		</MainContainer>
// 	);
// }
