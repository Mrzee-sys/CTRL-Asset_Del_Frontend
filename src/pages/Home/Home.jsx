import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiMonitor,
    FiShield,
    FiGrid,
    FiBarChart2,
    FiUsers,
    FiActivity,
    FiCheckSquare
} from "react-icons/fi";

// ✅ Correct paths based on your folder structure (up two levels)
import { listComputers } from "../../data/Computers/Computer.repository";
import { listQuals } from "../../data/Qualifications/Qualifications.Repository";

import "./home.css";

export default function Home() {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState({
        totalPCs: 0,
        assignedPCs: 0,
        expiredQuals: 0
    });

    useEffect(() => {
        // Fetch Real Data for the Dashboard
        async function fetchMetrics() {
            try {
                const [compData, qualData] = await Promise.all([
                    listComputers({ limit: 1000 }),
                    listQuals({})
                ]);

                const computers = compData.rows || [];
                const assigned = computers.filter(c => c.assignedTo && c.assignedTo !== "Unassigned").length;
                
                const now = new Date();
                const expired = qualData.filter(q => q.renewal && new Date(q.renewal) < now).length;

                setMetrics({
                    totalPCs: computers.length,
                    assignedPCs: assigned,
                    expiredQuals: expired
                });
            } catch (err) {
                console.error("Dashboard metrics failed:", err);
            }
        }
        fetchMetrics();
    }, []);

    const riskModules = [
        {
            title: "Asset Management",
            sub: "Computers, Servers, Networking, AV",
            metric: `PC Allocation: ${metrics.assignedPCs} / ${metrics.totalPCs} Assigned`,
            icon: FiMonitor,
            path: "/computers"
        },
        {
            title: "Application Tracking",
            sub: "Software inventory & license Tracking",
            metric: "15 Licensed Apps | Assignments Active",
            icon: FiGrid,
            path: "/applications"
        },
        {
            title: "People & Orgainisation",
            sub: "Staff certifications & Registration",
            metric: `${metrics.expiredQuals} Expired Quals Found`,
            icon: FiUsers,
            path: "/peporg"
        },
        {
            title: "Behavioral Analytics",
            sub: "Incident management & remediation",
            metric: "5 Open Events | 2 High Priority",
            icon: FiActivity,
            path: "/incident-manage"
        },
        {
            title: "Control Effectiveness",
            sub: "Audit controls & identified gaps (CTRL)",
            metric: "45 Controls Active | 2 Gaps Found",
            icon: FiCheckSquare,
            path: "/controls"
        },
        {
            title: "Compliance Lifecycle",
            sub: "Final verification & reporting (DEL)",
            metric: "Next Audit: May 2026",
            icon: FiShield,
            path: "/reporting"
        }
    ];

    return (
        <div className="shell">
            <header className="topbar">
                <div className="topbar__title">CTRL + Asset + DEL</div>
                <div className="status-indicator">
                    SYSTEM STATUS: ACTIVE
                    <div className="pulse-dot"></div>
                </div>
            </header>

            <main className="content">
                <div className="content__inner">
                    <h1 className="headline" style={{ color: '#0f172a', marginBottom: '8px' }}>
                        Intelligent Risk & Control Dashboard
                    </h1>
                    <p className="subhead" style={{ color: '#475569', marginBottom: '32px' }}>
                        Proactive monitoring for People, PCs, and Applications.
                    </p>

                    <div className="grid">
                        {riskModules.map((m) => {
                            const Icon = m.icon;
                            return (
                                <button key={m.title} className="tile" onClick={() => navigate(m.path)}>
                                    <div className="tile__icon">
                                        <Icon />
                                    </div>
                                    <div className="tile__info">
                                        <div style={{ fontWeight: 800, fontSize: '16px' }}>{m.title}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--tileSub)' }}>{m.sub}</div>
                                        <div className="tile__metrics">{m.metric}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>

            <footer className="footer">
                <span>© {new Date().getFullYear()} CTRL + Asset + DEL</span>
                <span className="footer__right">Tech2K IT - South Africa</span>
            </footer>
        </div>
    );
}