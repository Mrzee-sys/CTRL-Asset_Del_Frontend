import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    downloadSqlReadme,
    downloadSqlSchema,
    getSqlBundle,
    getSqlMode,
    setSqlMode,
} from "../../services/Settings.service";
import "../Home/home.css";
import "./settings.css";

function saveBlob(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
}

export default function SettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [useSql, setUseSql] = useState(false);
    const [bundle, setBundle] = useState({ readme: "", schemaSql: "" });
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const [modeRes, bundleRes] = await Promise.all([getSqlMode(), getSqlBundle()]);
                if (!mounted) return;
                setUseSql(Boolean(modeRes?.useSql));
                setBundle({
                    readme: String(bundleRes?.readme || ""),
                    schemaSql: String(bundleRes?.schemaSql || ""),
                });
            } catch (err) {
                if (!mounted) return;
                setError(err?.message || "Failed to load settings");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const sqlPreview = useMemo(() => {
        const text = String(bundle?.schemaSql || "");
        return text.length > 2600 ? `${text.slice(0, 2600)}\n\n-- output truncated in preview --` : text;
    }, [bundle]);

    async function toggleSqlMode() {
        setSaving(true);
        setError("");
        setMessage("");

        const next = !useSql;
        try {
            const res = await setSqlMode(next);
            setUseSql(Boolean(res?.useSql));
            setMessage(next ? "SQL backend mode is now enabled." : "Mongo backend mode is now enabled.");
        } catch (err) {
            setError(err?.message || "Failed to update SQL mode");
        } finally {
            setSaving(false);
        }
    }

    async function onDownloadReadme() {
        try {
            const blob = await downloadSqlReadme();
            saveBlob(blob, "sql-setup-readme.md");
        } catch (err) {
            setError(err?.message || "Failed to download README");
        }
    }

    async function onDownloadSchema() {
        try {
            const blob = await downloadSqlSchema();
            saveBlob(blob, "sql-schema.sql");
        } catch (err) {
            setError(err?.message || "Failed to download SQL schema");
        }
    }

    return (
        <div className="shell">
            <header className="topbar">
                <div className="topbar__title">CTRL + Asset + DEL</div>
                <div className="status-indicator">SETTINGS</div>
            </header>

            <main className="content">
                <div className="content__inner settings-wrap">
                    <button className="btn-electric btnGhost" type="button" onClick={() => navigate(-1)}>
                        Back
                    </button>

                    <h1 className="headline" style={{ color: "#0f172a", marginBottom: "6px" }}>
                        Platform Settings
                    </h1>
                    <p className="subhead" style={{ color: "#475569", marginBottom: "14px" }}>
                        SQL backend mode, setup files, and schema bootstrap downloads.
                    </p>

                    <section className="settings-card">
                        <div className="settings-title">Backend Data Mode</div>
                        <div className="settings-sub">
                            Enable SQL mode for the backend repositories. Current mode: {useSql ? "SQL" : "MongoDB"}.
                        </div>

                        <div className="switch-row">
                            <div className="switch-copy">
                                <div className="switch-head">Enable SQL Backend</div>
                                <div className="switch-detail">Switch data repository resolution between Mongo and SQL implementations.</div>
                            </div>
                            <button
                                type="button"
                                className={`switch-pill${useSql ? " enabled" : ""}`}
                                onClick={toggleSqlMode}
                                disabled={saving || loading}
                                aria-label="Toggle SQL backend mode"
                            />
                        </div>

                        {useSql ? (
                            <div className="settings-actions">
                                <button type="button" className="settings-btn" onClick={onDownloadReadme}>
                                    Download SQL Setup README
                                </button>
                                <button type="button" className="settings-btn" onClick={onDownloadSchema}>
                                    Download SQL Queries (.sql)
                                </button>
                            </div>
                        ) : (
                            <div className="settings-disabled-note">
                                Turn on SQL mode to show the setup file downloads.
                            </div>
                        )}

                        {useSql && (
                            <div className="sql-preview">
                                <pre>{sqlPreview}</pre>
                            </div>
                        )}

                        {message && <div className="settings-alert">{message}</div>}
                        {error && <div className="settings-alert">{error}</div>}
                    </section>

                    <section className="settings-card">
                        <div className="settings-title">Implementation Status</div>
                        <div className="settings-sub">
                            SQL table setup is provided. Some SQL repository operations in the current codebase are placeholders and may need completion before full parity.
                        </div>
                    </section>
                </div>
            </main>

            <footer className="footer">
                <span>{new Date().getFullYear()} CTRL + Asset + DEL</span>
                <span className="footer__right">Tech2K IT - South Africa</span>
            </footer>
        </div>
    );
}
