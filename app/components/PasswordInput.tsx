import { useState, ChangeEvent } from "react";

interface Props {
	label?: string;
	name: string;
	placeholder: string;
	defaultValue?: string;
	errors?: Record<string, any>;
	required?: boolean;
	ariaDescribedBy?: string;
	onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

const PasswordInput = ({
	label,
	name,
	placeholder,
	defaultValue,
	errors,
	required = false,
	ariaDescribedBy,
	onChange,
}: Props) => {
	const [passwordVisible, setPasswordVisible] = useState(false);

	const togglePasswordVisibility = () => {
		setPasswordVisible(!passwordVisible);
	};

	return (
		<>
			<div className="dts-form-component">
				<label>
					<div className="dts-form-component__label">
						<span>{label}</span>
					</div>
				</label>
				<div className="dts-form-component__pwd">
					<input
						type={passwordVisible ? "text" : "password"}
						autoComplete="off"
						name={name}
						placeholder={placeholder}
						defaultValue={defaultValue}
						className={errors?.fields?.[name] ? "input-error" : ""}
						required={required}
						onChange={onChange}
						aria-describedby={ariaDescribedBy}
					/>
					<button
						type="button"
						className="dts-form-component__pwd-toggle mg-button"
						aria-label="Toggle password visibility"
            onClick={togglePasswordVisibility}
					>
						<img
							src={
								passwordVisible
									? "/assets/icons/eye-hide-password.svg"
									: "/assets/icons/eye-show-password.svg"
							}
							alt=""
						/>
					</button>
				</div>
			</div>
		</>
	);
};

export default PasswordInput;
