interface TagProps {
	value: string;
}

const Tag = ({ value }: TagProps) => {
	const style: React.CSSProperties = {
		display: "inline-block",
		padding: "6px 14px",
		backgroundColor: "#FEF7E8",
		border: "1px solid #F8D79A",
		borderRadius: "8px",
		color: "#000",
		fontWeight: 500,
		fontSize: "1.2rem",
		textAlign: "center",
	};

	return <div style={style}>{value}</div>;
};

export default Tag;
