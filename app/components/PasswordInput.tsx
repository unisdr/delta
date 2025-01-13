import React, { useState } from "react";

interface Props {
  name: string;
  placeholder: string;
  defaultValue: string;
  errors?: Record<string, any>;
}

const PasswordInput = ({ name, placeholder, defaultValue, errors }: Props) => {
  const [passwordVisible, setPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <>
      <div
        className="password-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <input
          type={passwordVisible ? "text" : "password"}
          autoComplete="off"
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className='{errors?.fields?.password?"input-error":""}'
          style={{
            paddingRight: "1rem",
            width: "50%",
            height: "40px",
            border: errors?.fields?.currentPassword ? "1px solid red" : "",
          }}
        ></input>
        <img
          src={
            passwordVisible
              ? "/assets/icons/eye-hide-password.svg"
              : "/assets/icons/eye-show-password.svg"
          }
          alt={passwordVisible ? "Hide password" : "Show password"}
          onClick={togglePasswordVisibility}
          className="toggle-password-visibility"
          style={{
            right: "0.75rem",
            marginLeft: "-2.5rem",
            cursor: "pointer",
          }}
        />
      </div>
    </>
  );
};

export default PasswordInput;
