export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  gbu: string;
}

export const validators: Record<keyof RegisterForm, (value: string, form?: RegisterForm) => string> = {
  username: (v) => (!v.trim() ? "This field is required." : ""),

  email: (v) =>
    !v.trim()
      ? "This field is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? "Invalid email address."
      : "",

  password: (v) =>
    !v.trim()
      ? "This field is required."
      : v.length < 10
      ? "Minimum 10 characters."
      : "",

  confirmPassword: (v, form) =>
    form && v !== form.password
      ? "Passwords do not match."
      : "",

  gbu: (v) => (!v ? "Please select a GBU." : ""),
};
