import React from "react";
import { useState } from "react";

import {ChevronDownIcon} from "~/components/megamenudts/icons/icons"


function SidebarSection ({ section, display, onClick }) {
	const [itemIndex, setItemIndex] = useState(null);
	const [subItemIndex, setSubItemIndex] = useState(null);

	const onItemToggle = (index) => {
		if (index === itemIndex) {
				setItemIndex(null);
				return;
		}
		setItemIndex(index);
	};

	const onsubItemToggle = (index) => {
			if (index === subItemIndex) {
					setSubItemIndex(null);
					return;
			}
			setSubItemIndex(index);
	};

	return (
		<div className={`mg-mega-sidebar-section ${section.classes}`}>
			<div className="mg-mega-sidebar-section__item" onClick={(val) => onClick(val)}>
				<svg aria-hidden="true" focusable="false" role="img">
						<use href={section.icon} />
				</svg>
				<span>{section.title}</span>

				<ChevronDownIcon
					aria-hidden="true"
					focusable="false"
					role="img"
				/>
			</div>
			{
				display && (
					<ol>
						{
							section.items.map((item, index) => (
								<li key={index}>
									<div
										onClick={() => onItemToggle(index, this)} className="mg-mega-sidebar-section__item"
									>
										<span>{item.title}</span>
										<ChevronDownIcon
											aria-hidden="true"
											focusable="false"
											role="img"
										/>
									</div>
									{
										index === itemIndex && (
											<ol>
												{
													item.subItems.map((subItem, index) => (
														<li key={index}>

															{/* <div
																onClick={() => onsubItemToggle(index)} className="mg-mega-sidebar-section__item"
															> */}
															<div className="mg-mega-sidebar-section__item">
																<span>{subItem.title}</span>
															</div>
															{/* {
																index === subItemIndex && ( */}
																	<ol>
																		{
																			subItem.subsubItems.map((subsubItem, index) => (
																				<li key={index}>
																					<a href={subsubItem.url}>{subsubItem.title}</a>
																				</li>
																			))
																		}
																	</ol>
																{/* )
															} */}
														</li>
													))
												}
											</ol>
										)
									}
								</li>
							))
						}
					</ol>
				)
			}
		</div>
	)
}

export function Sidebar({ sections }) {
	const [sectionIndex, setSectionIndex] = useState(null);

	const onSectionToggle = (index) => {
		if (index === sectionIndex) {
			setSectionIndex(null);
			return
		}
		setSectionIndex(index);
	}

	return (
		<div className="mg-mega-content__sidebar">
			{
				sections.map((section, index) => (
					<SidebarSection section={section} key={index} display={sectionIndex === index} onClick={() => onSectionToggle(index)}/>
				))
			}
		</div>
	)
} 
