import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
});

// Mọi data nằm trong SQLite local, đọc qua IPC là tức thì → không cần cache
// vào localStorage. Mở app luôn đọc tươi từ DB.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={{
          fontFamily: "'Inter Variable', 'Inter', sans-serif",
          fontFamilyMonospace: "'Inter Variable', 'Inter', sans-serif",
          headings: { fontFamily: "'Inter Variable', 'Inter', sans-serif" },
        }}
      >
        <Notifications />
        <App />
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
);
