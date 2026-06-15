import React from "react";
import PageHeader from "../components/PageHeader";
import "../Styles/DetailPageLayout.css";

/**
 * DetailsLayout: 2-column master layout for detail pages (People, Organizations, Computers)
 * Optimized for the Slim Header style.
 */
const DetailsLayout = ({ 
    title, 
    subtitle, 
    pillText, 
    children, 
    sidebarContent,
    compactSidebar = false,
    renderHeaderInPanel = false,
    statsLabel1 = "ORG", // Default for your first image
    statsLabel2 = "PPL",  // Default for your first image
    backTo
}) => {
    return (
        <div className="assetPage">
            <div className="assetShell">
                {/* Passing isRegister={false} ensures we don't show 
                  the 'Total/Page' count box on a single detail record.
                */}
                {!renderHeaderInPanel && (
                    <PageHeader 
                        title={title} 
                        subtitle={subtitle} 
                        pillText={pillText}
                        isRegister={false} 
                        statsLabel1={statsLabel1}
                        statsLabel2={statsLabel2}
                        backTo={backTo}
                    />
                )}

                <main className={`assetGrid${compactSidebar ? " assetGrid--sidebarCompact" : ""}`}>
                    {/* Main Content Area (Left) */}
                    <section className="panel">
                        {renderHeaderInPanel && (
                            <PageHeader 
                                title={title} 
                                subtitle={subtitle} 
                                pillText={pillText}
                                isRegister={false} 
                                statsLabel1={statsLabel1}
                                statsLabel2={statsLabel2}
                                backTo={backTo}
                            />
                        )}
                        {children}
                    </section>

                    {/* Sidebar Area (Right) */}
                    <aside className={`panel panelSticky${compactSidebar ? " panelSticky--compact" : ""}`}>
                        <div className="sideBlocks sideBlocks--outer">
                            {sidebarContent}
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
};

export default DetailsLayout;