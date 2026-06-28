"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";

function ThemedToaster() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "10px",
          fontSize: "13px",
          padding: "10px 14px",
          background: isDark ? "#1f2937" : "#ffffff",
          color: isDark ? "#f9fafb" : "#111827",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7eb",
          boxShadow: isDark
            ? "0 4px 24px rgba(0,0,0,0.5)"
            : "0 4px 16px rgba(0,0,0,0.1)",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <ThemedToaster />
      </ThemeProvider>
    </SessionProvider>
  );
}
