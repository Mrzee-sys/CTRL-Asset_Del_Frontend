import React, { useState } from "react";
import Zbot_Fields from "../components/Zbot_Fields";
import { useNavigate } from "react-router-dom";

const backgroundStyle = {
  minHeight: "100vh",
  width: "100vw",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(246,247,251,0.85)",
};

const frameStyle = {
  background: "rgba(240,240,240,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  padding: "40px 32px",
  minWidth: 320,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  margin: "10px 0",
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: 16,
};

const buttonStyle = {
  width: "100%",
  margin: "18px 0 0 0",
  borderRadius: 8,
};

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiBaseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      localStorage.setItem("token", data.token || "");
      localStorage.setItem("role", data.user?.role || "");
      localStorage.setItem("user", JSON.stringify(data.user || {}));

      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={backgroundStyle}>
      <form style={frameStyle} onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: 24 }}>Login</h2>
        <Zbot_Fields
          label="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          className="value"
          required
        />
        <Zbot_Fields
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="value"
          type="password"
          required
        />
        {error && <div style={{ color: "#b71c1c", marginBottom: 8 }}>{error}</div>}
        <button className="btn-electric btnPrimary" style={buttonStyle} type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? "Signing in..." : "Login"}</span>
        </button>
      </form>
    </div>
  );
}
