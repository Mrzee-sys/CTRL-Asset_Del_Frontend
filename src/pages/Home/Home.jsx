import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiCpu,
    FiServer,
    FiGrid,
    FiWifi,
    FiTv,
    FiFolder,
    FiBarChart2,
    FiX,
} from "react-icons/fi";

import "./home.css";

const modules = [
    {
        title: "Computer Register",
        subtitle: "Assets, assignments and lifecycle",
        icon: FiCpu, // ✅ component reference (NOT <FiCpu />)
        path: "/computers",
    },
    {
        title: "Server Register",
        subtitle: "Physical & virtual server inventory",
        icon: FiServer,
        path: "/servers",
    },
    {
        title: "Application Management",
        subtitle: "Apps, licensing, owners and status",
        icon: FiGrid,
        path: "/applications",
    },
    {
        title: "Network Hardware",
        subtitle: "Switches, routers, firewalls & APs",
        icon: FiWifi,
        path: "/network-hardware",
    },
    {
        title: "Audio Visual",
        subtitle: "Meeting room equipment & AV assets",
        icon: FiTv,
        path: "/audio-visual",
    },
    {
        title: "Document Management",
        subtitle: "Warranties, invoices, policies & files",
        icon: FiFolder,
        path: "/documents",
    },
    {
        title: "Reporting",
        subtitle: "Dashboards, exports and insights",
        icon: FiBarChart2,
        path: "/reporting",
    },
];

export default function Home() {
    const navigate = useNavigate();

    useEffect(() => {
        // Home-only: make the center panel transparent (if you're using this feature)
        const panel = document.querySelector(".appContent");
        if (panel) panel.classList.add("homePanel");
        return () => {
            if (panel) panel.classList.remove("homePanel");
        };
    }, []);

    return (
        <div className="shell">
            {/* Top bar */}
            <header className="topbar">
                <div className="topbar__title">CTRL + Asset + DEL</div>

                <button
                    className="topbar__iconBtn"
                    aria-label="Close"
                    onClick={() => console.log("Close clicked")}
                    type="button"
                    title="Close"
                >
                    <FiX />
                </button>
            </header>

            {/* Main content */}
            <main className="content">
                <div className="content__inner">
                    <h1 className="headline">Asset Management Modules</h1>
                    <p className="subhead">
                        Choose a module to begin managing assets, documents and reporting.
                    </p>

                    <section className="grid">
                        {modules.map((m) => {
                            const Icon = m.icon; // ✅ pull component out
                            return (
                                <button
                                    key={m.title}
                                    className="tile"
                                    type="button"
                                    onClick={() => navigate(m.path)}
                                >
                                    <div className="tile__icon" aria-hidden="true">
                                        <Icon /> {/* ✅ renders <svg> ... </svg> */}
                                    </div>

                                    <div className="tile__text">
                                        <div className="tile__title">{m.title}</div>
                                        <div className="tile__subtitle">{m.subtitle}</div>
                                    </div>

                                    <div className="tile__chev">›</div>
                                </button>
                            );
                        })}
                    </section>

                    {/* reserved whitespace at bottom for future content */}
                    <div className="homeBottomSpace" />
                </div>
            </main>

            {/* Footer */}
            <footer className="footer">
                <span>© {new Date().getFullYear()} CTRL + Asset + DEL</span>
                <span className="footer__right">Tech2K IT</span>
            </footer>
        </div>
    );
}