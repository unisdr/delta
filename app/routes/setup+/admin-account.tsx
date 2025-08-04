/*import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useLocation } from "@remix-run/react";

import { formStringData } from "~/util/httputil";
import { createUserSession } from "~/util/session";
import { getUserFromSession } from "~/util/session";

import type { SetupAdminAccountFields } from "~/backend.server/models/user/admin";

interface ActionData {
  errors?: {
    form?: string[];
    fields?: {
      [key: string]: string[];
    };
  };
}
import { setupAdminAccount, setupAdminAccountFieldsFromMap } from "~/backend.server/models/user/admin";

export const meta: MetaFunction = () => {
  return [
    { title: "Account Setup - DTS" },
    { name: "description", content: "Admin setup." },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userSession = await getUserFromSession(request);
  let prefill: Partial<SetupAdminAccountFields> = {};
  if (userSession && userSession.user && userSession.user.emailVerified === false) {
    prefill = {
      email: userSession.user.email || "",
      firstName: userSession.user.firstName || "",
      lastName: userSession.user.lastName || "",
    };
  }
  return { prefill };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const data = formStringData(await request.formData());
    const data2 = setupAdminAccountFieldsFromMap(data);
    const res = await setupAdminAccount(data2);
    if (!res.ok) {
      return ({ data, errors: res.errors });
    }
    const headers = await createUserSession(res.userId);
    if (res.pendingActivation) {
      // Redirect with query param to show verify snackbar
      return redirect("/user/verify-email?showVerifySnackbar=1", { headers });
    }
    return redirect("/user/verify-email", { headers });
  } catch (error) {
    console.error('Error during form submission:', error);
    return ({ error: 'Unexpected error occurred.' });
  }
};*/

export default function Screen() {
  <div> Page removed</div>
  /*const loaderData = useLoaderData<{ prefill?: Partial<SetupAdminAccountFields> }>() || { prefill: {} };
  const location = useLocation();
  const [showSecurityMsg, setShowSecurityMsg] = useState(false);

  useEffect(() => {
    // If the user comes from the verify-email page, show the security message
    if (location.state && location.state.fromVerifyEmail) {
      setShowSecurityMsg(true);
    }
  }, [location.state]);

  const [email, setEmail] = useState(loaderData.prefill?.email || "");
  const [firstname, setFirstname] = useState(loaderData.prefill?.firstName || "");
  const [secondname, setSecondname] = useState(loaderData.prefill?.lastName || "");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [passwordType, setPasswordType] = useState("password");
  const [passwordRepeatType, setPasswordRepeatType] = useState("password");

  const actionData = useActionData<ActionData>();

  // Function to check if all form fields are valid
  const isFormValid = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&_]/.test(password);

    const hasTwoOfTheFollowing = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length >= 2;

    return (
      emailRegex.test(email) &&
      firstname &&
      password &&
      passwordRepeat &&
      password === passwordRepeat &&
      hasTwoOfTheFollowing &&
      password.length >= 12 &&
      password !== email
    );
  };

  useEffect(() => {
    const submitButton = document.querySelector("button[type='submit']") as HTMLButtonElement;
    const imgToggle = document.querySelector("[id='passwordToggleImg']") as HTMLImageElement;
		const imgToggle2 = document.querySelector("[id='passwordToggleImg2']") as HTMLImageElement;
    if (submitButton) {
      submitButton.disabled = !isFormValid(); // Initially disable submit if form is not valid
    }
    if (imgToggle) {
			imgToggle.style.display='block';
		}
		if (imgToggle2) {
			imgToggle2.style.display='block';
		}
  }, [email, firstname, secondname, password, passwordRepeat]); // Re-run when these dependencies change

  // Restore form fields from sessionStorage if available
  useEffect(() => {
    const saved = sessionStorage.getItem('dts-admin-account');
    if (saved) {
      try {
        const { email, firstname, secondname, password, passwordRepeat } = JSON.parse(saved);
        setEmail(email || "");
        setFirstname(firstname || "");
        setSecondname(secondname || "");
        setPassword(password || "");
        setPasswordRepeat(passwordRepeat || "");
      } catch {}
    }
  }, []);

  // Save form fields to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem('dts-admin-account', JSON.stringify({ email, firstname, secondname, password, passwordRepeat }));
  }, [email, firstname, secondname, password, passwordRepeat]);

  const togglePasswordVisibility = () => {
    setPasswordType(passwordType === "password" ? "text" : "password");
  };

  const toggleConfirmPasswordVisibility = () => {
    setPasswordRepeatType(passwordRepeatType === "password" ? "text" : "password");
  };*/
  
  // return (
    // <div className="dts-page-container">
    //   <main className="dts-main-container">
    //     <div className="mg-container">
    //       <Form method="post" className="dts-form dts-form--vertical">
    //         <div className="dts-form__header">
    //           <a
    //             href="/setup/admin-account-welcome"
    //             className="mg-button mg-button--small mg-button-system"
    //           >
    //             Back
    //           </a>
    //           <span>Disaster Tracking System</span>
    //         </div>
    //         <div className="dts-form__intro">
    //           <h2 className="dts-heading-1">Set up account</h2>
    //           <p>Create your account by filling in the required details.</p>
    //         </div>
    //         <div className="dts-form__body">
    //           <p>*Required information</p>
    //           <div className="dts-form-component">
    //             <label htmlFor="email">
    //               <input
    //                 type="email"
    //                 id="email"
    //                 name="email"
    //                 placeholder="Email address*"
    //                 autoFocus
    //                 required
    //                 value={email}
    //                 onChange={(e) => setEmail(e.target.value)}
    //                 className={
    //                   actionData?.errors?.fields?.email 
    //                     ? "input-error"
    //                     : "input-normal"
    //                 }
    //               />
    //               </label>
    //             {actionData?.errors?.fields?.email && (
    //               <div className="dts-form-component__hint--error">
    //                 <div className="dts-form-component__hint--error" aria-live="assertive">
    //                   {(actionData.errors.fields as any).email?.[0]}
    //                 </div>
    //               </div>
    //             )}
                
    //           </div>
    //           <div className="dts-form-component">
    //             <label htmlFor="firstName">
    //               <input
    //                 type="text"
    //                 id="firstName"
    //                 name="firstName"
    //                 placeholder="First name*"
    //                 required
    //                 value={firstname}
    //                 onChange={(e) => setFirstname(e.target.value)}
    //               />
    //             </label>
    //           </div>
    //           <div className="dts-form-component">
    //             <label htmlFor="secondname">
    //               <input
    //                 type="text"
    //                 id="secondname"
    //                 name="secondname"
    //                 placeholder="Last name"
    //                 value={secondname}
    //                 onChange={(e) => setSecondname(e.target.value)}
    //               />
    //             </label>
    //           </div>
    //           <div className="dts-form-component">
    //             <label htmlFor="password">
    //               <div className="dts-form-component__pwd">
    //                   <input
    //                     type={passwordType}
    //                     id="password"
    //                     name="password"
    //                     placeholder="Enter password*"
    //                     minLength={12}
    //                     required
    //                     value={password}
    //                     onChange={(e) => setPassword(e.target.value)}
    //                   />
    //                   <button
    //                     type="button"
    //                     onClick={togglePasswordVisibility}
    //                     aria-label="Toggle password visibility"
    //                     className="dts-form-component__pwd-toggle mg-button"
    //                   >
    //                     {passwordType === "password" ?
    //                       <img src="/assets/icons/eye-hide-password.svg" id="passwordToggleImg" style={{display:"none"}} alt=""></img> :
		// 									    <img src="/assets/icons/eye-show-password.svg" id="passwordToggleImg" style={{display:"none"}} alt=""></img>
    //                     }
    //                   </button>
    //               </div>
    //             </label>
    //           </div>
    //           <div className="dts-form-component">
    //             <label htmlFor="passwordRepeat">
    //               <div className="dts-form-component__pwd">
    //                 <input
    //                   type={passwordRepeatType}
    //                   id="passwordRepeat"
    //                   name="passwordRepeat"
    //                   placeholder="Confirm password*"
    //                   minLength={12}
    //                   required
    //                   value={passwordRepeat}
    //                   onChange={(e) => setPasswordRepeat(e.target.value)}
    //                 />
    //                 <button
    //                   type="button"
    //                   onClick={toggleConfirmPasswordVisibility}
    //                   aria-label="Toggle confirm password visibility"
    //                   className="dts-form-component__pwd-toggle mg-button"
    //                 >
    //                   {passwordRepeatType === "password" ?
		// 										<img src="/assets/icons/eye-hide-password.svg" id="passwordToggleImg2" style={{display:"none"}} alt=""></img> :
		// 										<img src="/assets/icons/eye-show-password.svg" id="passwordToggleImg2" style={{display:"none"}} alt=""></img>
    //                   }
    //                 </button>
    //               </div>
    //             </label>
    //           </div>
    //         </div>

    //         {/* Show security message if coming from verify-email */}
    //         {showSecurityMsg && (
    //           <div className="dts-form-component__hint dts-form-component__hint--error">
    //             For your security, please re-enter your password and then confirm it to continue.
    //           </div>
    //         )}

    //         {/* Password Requirements */}
    //         <div className="dts-form-component__hint">
    //           <ul id="passwordDescription">
    //             <li>At least 12 characters long</li>
    //             <li>
    //               Must include two of the following:
    //               <ul>
    //                 <li>Uppercase letters</li>
    //                 <li>Lowercase letters</li>
    //                 <li>Numbers</li>
    //                 <li>Special characters</li>
    //               </ul>
    //             </li>
    //             <li>Cannot be the same as the username</li>
    //             <li>Should not be a simple or commonly used password</li>
    //           </ul>
    //         </div>

    //         <div className="dts-form__actions">
    //           <button
    //             type="submit"
    //             className="mg-button mg-button-primary"
    //           >
    //             Set up account
    //           </button>
    //         </div>
    //       </Form>
    //     </div>
    //   </main>
    // </div>
  // );
  
}
