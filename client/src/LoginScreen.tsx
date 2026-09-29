import { useState } from "react";
import { login, LoginResponse } from "./api.js";

export function LoginScreen({ onLogin }: { onLogin: (user: LoginResponse["data"]["user"]) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ background: "#edf6f0" }}>
    <section className="card border-0 shadow-sm w-100 overflow-hidden" style={{ maxWidth: 440, borderRadius: 20 }}>
      <header className="bg-success text-white p-4 text-center">
        <h1 className="h3 mb-0">TokTickIT Login</h1>
      </header>
      <form className="p-4" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError("");
        try { onLogin((await login(email.trim(), password)).data.user); }
        catch (error) { setError(error instanceof Error ? error.message : "Unable to log in. Please try again."); }
        finally { setBusy(false); }
      }}>
        <h2 className="h5 text-success">Welcome back</h2>
        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">Email</label>
          <input id="login-email" type="email" autoComplete="username" className="form-control form-control-lg" placeholder="you@toktickit.test" required value={email} onChange={event => setEmail(event.target.value)} />
        </div>
        <div className="mb-4">
          <label htmlFor="login-password" className="form-label">Password</label>
          <input id="login-password" type="password" autoComplete="current-password" className="form-control form-control-lg" required value={password} onChange={event => setPassword(event.target.value)} />
        </div>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <button type="submit" className="btn btn-success btn-lg w-100" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>
      </form>
    </section>
  </main>;
}
