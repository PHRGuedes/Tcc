"use client";

import { createContext, useContext, useState } from "react";

const SidebarContext = createContext({
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  toggleMobile: () => {},
});

export function SidebarProvider({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        setIsMobileOpen,
        toggleMobile: () => setIsMobileOpen((prev) => !prev),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
