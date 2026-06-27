// Authored preview — the login / register form. A mode toggle switches between
// signing in and creating an account (the register mode adds an email field).
// onAuthenticated fires after the backend returns a token; it's a no-op here.
import { AuthForm } from "ideophone-arena-web";

export const Default = () => (
  <div style={{ maxWidth: 420 }}>
    <AuthForm onAuthenticated={() => {}} />
  </div>
);
