import React from "react";
import { useNavigate } from "react-router-dom";

const PageHeader = ({ 
    title = "Loading...", 
    subtitle, 
    pillText, 
    totalCount = 0, 
    pageInfo = "1 / 1", 
    statsLabel1 = "PC", 
    statsLabel2 = "OWN",
    isRegister = true // Logic: true shows Total/Page box, false hides it
}) => {
    const navigate = useNavigate();

    return (
        <header className="cr-header-slim">
            {/* LEFT: Back Button */}
            <div className="cr-header-left">
                <button className="cr-back-btn" onClick={() => navigate(-1)} type="button">
                    ← Back
                </button>
            </div>

            {/* CENTER: Dynamic Title and Subtitle */}
            <div className="cr-header-center">
                <div className="cr-title-group">
                    <h1 className="cr-title-text">{title}</h1>
                    {pillText && <span className="cr-pill-green">{pillText}</span>}
                </div>
                {subtitle && <div className="cr-subtitle-text">{subtitle}</div>}
            </div>

            {/* RIGHT: Stats and Icons */}
            <div className="cr-header-right">
                {/* Only show the Total/Page info on Register pages.
                   This is hidden automatically on Details pages (People, Orgs, etc.)
                */}
                {isRegister && (
                    <div className="cr-stats-display">
                        <div className="cr-stat-item">
                            <span className="cr-stat-label">Total</span>
                            <span className="cr-stat-value">{totalCount}</span>
                        </div>
                        <div className="cr-stat-item">
                            <span className="cr-stat-label">Page</span>
                            <span className="cr-stat-value">{pageInfo}</span>
                        </div>
                    </div>
                )}

                {/* These are the square white boxes (e.g., ORG, PPL, PC, OWN) */}
                <div className="cr-icon-box">{statsLabel1}</div>
                <div className="cr-icon-box">{statsLabel2}</div>
            </div>
        </header>
    );
};

export default PageHeader;