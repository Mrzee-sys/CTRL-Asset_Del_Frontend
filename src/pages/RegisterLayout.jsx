import React from "react";
import PageHeader from "../components/PageHeader";
import "../Styles/DetailPageLayout.css";

/**
 * RegisterLayout: 1-column master layout for register/list pages
 * Props:
 * - title, subtitle, pillText: passed to PageHeader
 * - totalCount, pageInfo: numeric stats for the header
 * - toolbarContent: search/add buttons, etc (top)
 * - children: table/list content (main)
 */
const RegisterLayout = ({ 
  title, 
  subtitle, 
  pillText, 
  totalCount, 
  pageInfo,
  toolbarContent, 
  children 
}) => (
  /* assetPage handles the background gradient/height */
  <div className="assetPage">
    <div className="assetShell">
      {/* isRegister={true} triggers the 'Total' and 'Page' display 
          statsLabel1 and statsLabel2 default to PC and OWN per your PageHeader.jsx
      */}
      <PageHeader 
        title={title} 
        subtitle={subtitle} 
        pillText={pillText} 
        totalCount={totalCount}
        pageInfo={pageInfo}
        isRegister={true}
      />
      
      {/* Search Bar and Add Buttons area */}
      {toolbarContent && (
        <div className="cr-toolbar" style={{ marginTop: '12px' }}>
          {toolbarContent}
        </div>
      )}

      {/* Main Table Content area */}
      <section className="cr-tableWrap" style={{ marginTop: '12px' }}>
        {children}
      </section>
    </div>
  </div>
);

export default RegisterLayout;