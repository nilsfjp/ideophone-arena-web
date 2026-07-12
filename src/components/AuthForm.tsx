import { useState } from "react";
import type { FormEvent } from "react";
import { login, register } from "../api/client";
import type { AuthResponse } from "../api/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

type AuthMode = "login" | "register";

type AuthFormProps = {
  onAuthenticated: (response: AuthResponse) => void;
  /** Which tab opens first. Landing CTAs open on "register"; the default and
      the auth-expiry re-login stay on "login". Read once at mount - the auth
      view mounts fresh on each entry, so the initializer re-runs. */
  initialMode?: AuthMode;
};

export default function AuthForm({
  onAuthenticated,
  initialMode = "login",
}: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response =
        mode === "login"
          ? await login({ username, password })
          : await register({ username, email, password });

      onAuthenticated(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      {/* shadcn Tabs as the login/register switcher (chrome, §5). The triggers
          stay <button>s carrying "Login"/"Register" so the browser loop's
          text-based tab click keeps resolving. */}
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as AuthMode)}
        className="items-center mb-6"
        aria-label="Authentication mode"
      >
        <TabsList className="auth-tabs">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
      </Tabs>

      <h1 id="auth-title">Ideophone Arena</h1>
      <p className="muted">
        Choose the ideophone that best matches the target meaning.
      </p>

      {/* Native wrapping labels keep the input a descendant of its label - the
          browser loop associates fields by label text, not htmlFor. */}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Username
          <Input
            autoComplete="username"
            minLength={3}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        {mode === "register" ? (
          <label>
            Email
            <Input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        ) : null}

        <label>
          Password
          <Input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Register"}
        </Button>
      </form>
    </section>
  );
}
