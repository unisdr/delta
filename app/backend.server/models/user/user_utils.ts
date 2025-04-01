import { Errors, initErrorField } from "~/frontend/form";

export interface Errors2 {
  field1?: string;
  field2?: string;
}

interface EmailField {
  email: string;
}

export function validateEmail(data: EmailField, errors: Errors<EmailField>) {
  let email = initErrorField(errors, "email");
  if (data.email == "") {
    email.push("Email is required");
  }
}

interface NameFields {
  firstName: string;
  lastName: string;
}
export function validateName(data: NameFields, errors: Errors<NameFields>) {
  let firstName = initErrorField(errors, "firstName");
  if (data.firstName == "") {
    firstName.push("First name is required");
  }
}

interface PasswordFields {
  password: string;
  passwordRepeat: string;
}

export function validatePassword(
  data: PasswordFields,
  errors: Errors<PasswordFields>
) {
  let password = initErrorField(errors, "password");
  let passwordRepeat = initErrorField(errors, "passwordRepeat");
  errors.form = errors.form || [];
  if (data.password == "") {
    password.push("Password is empty");
  }
  if (data.passwordRepeat == "") {
    passwordRepeat.push("Please repeat password");
  }
  if (
    data.password != "" &&
    data.passwordRepeat != "" &&
    data.password != data.passwordRepeat
  ) {
    const msg = "Passwords do not match";
    errors.form.push(msg);
    password.push(msg);
    passwordRepeat.push(msg);
  }
}
