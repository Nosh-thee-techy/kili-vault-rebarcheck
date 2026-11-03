import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { queryClient } from "@/lib/queryClient";
import App from "@/App";
import "@/index.css";
import "@esri/calcite-components/dist/calcite/calcite.css";

defineCustomElements(window);

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
