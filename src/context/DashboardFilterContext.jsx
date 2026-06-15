import React, { createContext, useContext, useMemo, useState } from "react";

const DashboardFilterContext = createContext(null);

export function DashboardFilterProvider({ children }) {
  const [activeDashboardFilter, setActiveDashboardFilter] = useState(null);

  const value = useMemo(() => ({
    activeDashboardFilter,
    setActiveDashboardFilter,
    clearActiveDashboardFilter: () => setActiveDashboardFilter(null),
  }), [activeDashboardFilter]);

  return (
    <DashboardFilterContext.Provider value={value}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilter() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error("useDashboardFilter must be used within DashboardFilterProvider");
  }
  return context;
}
