import React from 'react';

type Option = Record<string, any>;

interface ListBoxProps<T = any> {
	value: T | null;
	onChange: (event: { value: T }) => void;
	options: T[];
	itemTemplate?: (option: T) => React.ReactNode;
	className?: string;
    listStyle?: React.CSSProperties;
}

export const ListBox = <T extends Option>({
	value,
	onChange,
	options,
	itemTemplate,
	className,
    listStyle
}: ListBoxProps<T>) => {
	const handleSelect = (option: T) => {
		onChange({ value: option });
	};

	const listBoxStyle: React.CSSProperties = {
		maxHeight: '200px',
		overflowY: 'auto',
		border: '1px solid #ccc',
		borderRadius: '6px',
		padding: '0.5rem',
        ...listStyle
	};

	const optionStyle: React.CSSProperties = {
		padding: '0.5rem',
		cursor: 'pointer',
		borderRadius: '4px',
		transition: 'background 0.2s ease',
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem'
	};

	const selectedStyle: React.CSSProperties = {
		backgroundColor: '#3b82f6',
		color: 'white'
	};

	const hoverStyle: React.CSSProperties = {
		backgroundColor: '#f3f4f6'
	};

	return (
		<div style={listBoxStyle} className={className}>
			{options.map((option, index) => {
				const isSelected = value && JSON.stringify(value) === JSON.stringify(option);

				return (
					<div
						key={index}
						onClick={() => handleSelect(option)}
						style={{
							...optionStyle,
							...(isSelected ? selectedStyle : {}),
						}}
						onMouseEnter={(e) => {
							if (!isSelected) {
								(e.currentTarget as HTMLDivElement).style.backgroundColor =
									hoverStyle.backgroundColor!;
							}
						}}
						onMouseLeave={(e) => {
							if (!isSelected) {
								(e.currentTarget as HTMLDivElement).style.backgroundColor = '';
							}
						}}
					>
						{itemTemplate ? itemTemplate(option) : JSON.stringify(option)}
					</div>
				);
			})}
		</div>
	);
};
