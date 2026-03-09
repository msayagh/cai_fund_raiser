import React, { useEffect, useState } from "react";
import { bootstrapAdmin, getAdminSetupStatus } from "../api/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid #2e3250",
  background: "#0e1020",
  color: "#f0e8d8",
  fontSize: "14px",
  boxSizing: "border-box",
};

export default function AdminSetup({ navigate }) {
  const [status, setStatus] = useState({
    loading: true,
    checked: false,
    adminExists: false,
    adminCount: 0,
    error: null,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = async () => {
    setStatus((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getAdminSetupStatus();
      setStatus({
        loading: false,
        checked: true,
        adminExists: data.adminExists,
        adminCount: data.adminCount,
        error: null,
      });
    } catch (err) {
      setStatus({
        loading: false,
        checked: false,
        adminExists: false,
        adminCount: 0,
        error: err?.message || "Failed to fetch",
      });
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const onBootstrap = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const admin = await bootstrapAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      localStorage.setItem("mosque_admin", JSON.stringify({
        id: admin.id,
        name: admin.name,
        email: admin.email,
      }));
      navigate("admin");
    } catch (err) {
      setSubmitError(err?.message || "Failed to create initial admin.");
      if (err?.code === "BOOTSTRAP_CLOSED") {
        loadStatus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <div style={{ background:"#131628", border:"1px solid #2e3250", borderRadius:"16px", padding:"40px", maxWidth:"520px", width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>🕌</div>
        <h2 style={{ color:"#D4A96E", fontFamily:"'Cinzel',serif", marginBottom:"12px" }}>Admin Setup</h2>

        {status.loading && (
          <p style={{ color:"#c0c0d8", marginBottom:"20px" }}>
            Checking admin setup status...
          </p>
        )}

        {!status.loading && status.error && (
          <div style={{ background:"rgba(224,96,96,0.12)", border:"1px solid #e06060", borderRadius:"10px", padding:"14px", color:"#ffb4b4", textAlign:"left", marginBottom:"16px" }}>
            <div style={{ fontWeight:700, marginBottom:"6px" }}>Cannot reach backend API</div>
            <div style={{ fontSize:"13px", lineHeight:1.5 }}>
              Error: {status.error}<br />
              API URL: <strong>{API_BASE}</strong><br />
              Start backend and retry: <strong>npm --prefix backend run dev</strong>
            </div>
          </div>
        )}

        {!status.loading && !status.error && status.checked && status.adminExists && (
          <>
            <p style={{ color:"#c0c0d8", marginBottom:"20px" }}>
              Admin account(s) already exist: <strong style={{ color:"#D4A96E" }}>{status.adminCount}</strong>.
            </p>
            <p style={{ color:"#c0c0d8", marginBottom:"24px", fontSize:"14px" }}>
              Use the Admin login page with your existing credentials.
            </p>
          </>
        )}

        {!status.loading && !status.error && status.checked && !status.adminExists && (
          <>
            <p style={{ color:"#c0c0d8", marginBottom:"20px" }}>
              No admin account found. Create the initial administrator to bootstrap production.
            </p>

            <form onSubmit={onBootstrap} style={{ textAlign:"left", marginBottom:"22px" }}>
              <div style={{ marginBottom:"10px" }}>
                <label style={{ display:"block", color:"#c0c0d8", fontSize:"12px", marginBottom:"4px" }}>Full Name</label>
                <input type="text" minLength={2} required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom:"10px" }}>
                <label style={{ display:"block", color:"#c0c0d8", fontSize:"12px", marginBottom:"4px" }}>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom:"10px" }}>
                <label style={{ display:"block", color:"#c0c0d8", fontSize:"12px", marginBottom:"4px" }}>Password</label>
                <input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom:"10px" }}>
                <label style={{ display:"block", color:"#c0c0d8", fontSize:"12px", marginBottom:"4px" }}>Confirm Password</label>
                <input type="password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
              </div>

              {submitError && (
                <div style={{ color:"#ffb4b4", fontSize:"13px", marginTop:"8px" }}>{submitError}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{ marginTop:"14px", padding:"11px 22px", background: submitting ? "#2e3250" : "#D4A96E", border:"none", borderRadius:"8px", color: submitting ? "#9ea2c4" : "#000", fontWeight:800, cursor: submitting ? "not-allowed" : "pointer", fontSize:"14px" }}>
                {submitting ? "Creating..." : "Create Initial Admin"}
              </button>
            </form>
          </>
        )}

        <button
          onClick={() => navigate("admin")}
          style={{ padding:"13px 32px", background:"#D4A96E", border:"none", borderRadius:"8px", color:"#000", fontWeight:800, cursor:"pointer", fontSize:"15px" }}>
          Go to Admin Panel →
        </button>
      </div>
    </div>
  );
}
