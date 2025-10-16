interface TagProps {
	value: string | undefined;
	severity?: "info" | "warning";
}

const Tag = ({ value, severity = "info" }: TagProps) => {
	const baseStyle: React.CSSProperties = {
		display: "inline-block",
		padding: "6px 14px",
		borderRadius: "8px",
		color: "#000",
		fontWeight: 500,
		fontSize: "0.86rem",
		textAlign: "center",
		margin:"2px"
	};
	const style: React.CSSProperties = {
		...baseStyle,
		backgroundColor: severity === "info" ? "#DBE7F7" : "#FEF7E8",
		border: severity === "info" ? "1px solid #9DB9E0" : "1px solid #F8D79A",
	};

	return <div style={style}>{value}</div>;
};

export default Tag;
