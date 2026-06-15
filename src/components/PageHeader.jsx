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
    isRegister = true, // Logic: true shows Total/Page box, false hides it
    backTo
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (backTo) {
            window.location.assign(backTo);
            return;
        }
        if (window.location.pathname.toLowerCase().includes("/peporg")) {
            navigate("/");
        } else {
            navigate(-1);
        }
    };

    return (
        <header className="cr-header-slim">
            {/* LEFT: Back Button */}
            <div className="cr-header-left">
                <button className="btn-electric btnGhost cr-back-btn" onClick={handleBack} type="button">
                    <span>← Back</span>
                </button>
            </div>

            {/* CENTER: Executive Dashboard Title */}
            <div className="cr-header-center">
                <div className="cr-title-group">
                    <h1 className="cr-title-text animate-gradient-text" style={{ fontWeight: 900, fontSize: '2.3rem', letterSpacing: 0.5 }}>
                        {title}
                    </h1>
                    {pillText && <span className="cr-pill-green">{pillText}</span>}
                </div>
                {subtitle && <div className="cr-subtitle-text">{subtitle}</div>}
            </div>

            {/* RIGHT: Stats and Icons */}
            <div className="cr-header-right">
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
                <div className="cr-icon-box">{statsLabel1}</div>
                <div className="cr-icon-box">{statsLabel2}</div>
            </div>
        </header>
    );
};

export default PageHeader;