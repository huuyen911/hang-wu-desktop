// Bản desktop tải qua file:// → dùng hash router thay vì browser router.
import Layout from "@/components/Layout";
import BackupPage from "@/pages/BackupPage";
import Home from "@/pages/Home";
import MasterDataPage from "@/pages/MasterDataPage";
import ToolPage from "@/pages/ToolPage";
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "tools/:toolId", element: <ToolPage /> },
      { path: "master-data/:pageId", element: <MasterDataPage /> },
      { path: "system/backup", element: <BackupPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
