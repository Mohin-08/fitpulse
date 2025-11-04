import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthWithProfile() {
  const [mode, setMode] = useState("signup"); // "signup" or "login"
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    age: "",
    height: "",
    weight: "",
    goal: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Signup with email/password and collect profile info
  const handleSignup = async () => {
    setError("");
    setMessage("");
    const { email, password } = form;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);
    setMessage("Sign up successful. Check your email to verify and login.");
  };

  // Login with email/password
  const handleLogin = async () => {
    setError("");
    setMessage("");
    const { email, password } = form;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
  };

  const handleGithub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github" });
    if (error) setError(error.message);
  };

  return (
    <div style={{
      maxWidth: 400,
      margin: "auto",
      padding: "32px 28px",
      background: "#232323",
      borderRadius: 12,
      boxShadow: "0 3px 18px rgb(0 0 0 / 15%)"
    }}>
      <h2 style={{ textAlign: "center", color: "#fff", marginBottom: 20 }}>FitPulse</h2>
      <div style={{
        display: "flex", justifyContent: "center", marginBottom: 20, gap: "12px"
      }}>
        <button
          style={{
            padding: "8px 22px",
            background: mode === "signup" ? "#3855e2" : "#2a2a2a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
          onClick={() => setMode("signup")}
        >
          Sign Up
        </button>
        <button
          style={{
            padding: "8px 22px",
            background: mode === "login" ? "#3855e2" : "#2a2a2a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
          onClick={() => setMode("login")}
        >
          Log In
        </button>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          mode === "signup" ? handleSignup() : handleLogin();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          style={{
            padding: "10px",
            borderRadius: 4,
            border: "1px solid #444",
            outline: "none"
          }}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          style={{
            padding: "10px",
            borderRadius: 4,
            border: "1px solid #444"
          }}
        />
        {mode === "signup" && (
          <>
            <input name="name" placeholder="Name" value={form.name} onChange={handleChange}
              style={{ padding: "10px", borderRadius: 4, border: "1px solid #444" }} />
            <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange}
              style={{ padding: "10px", borderRadius: 4, border: "1px solid #444" }} />
            <input name="height" type="number" placeholder="Height (cm)" value={form.height} onChange={handleChange}
              style={{ padding: "10px", borderRadius: 4, border: "1px solid #444" }} />
            <input name="weight" type="number" placeholder="Weight (kg)" value={form.weight} onChange={handleChange}
              style={{ padding: "10px", borderRadius: 4, border: "1px solid #444" }} />
            <input name="goal" placeholder="Your Fitness Goal" value={form.goal} onChange={handleChange}
              style={{ padding: "10px", borderRadius: 4, border: "1px solid #444" }} />
          </>
        )}
        <button
          type="submit"
          style={{
            marginTop: "8px",
            background: "#3855e2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "12px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          {mode === "signup" ? "Sign Up" : "Log In"}
        </button>
      </form>
      <div style={{ margin: "18px 0", textAlign: "center" }}>
        <button
          style={{
            background: "#222",
            color: "#fff",
            borderRadius: 6,
            padding: "11px 0",
            width: "100%",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer"
          }}
          onClick={handleGithub}
        >
          {mode === "signup" ? "Sign Up" : "Log In"} with GitHub
        </button>
      </div>
      {error && <p style={{ color: "#ff7676" }}>{error}</p>}
      {message && <p style={{ color: "#7c98fd" }}>{message}</p>}
    </div>
  );
}
