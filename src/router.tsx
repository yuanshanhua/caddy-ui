/**
 * Application router configuration.
 */

import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard";
import { GlobalConfigPage, NotFoundPage, TlsPage, UpstreamsPage } from "@/pages/placeholder";
import { RawConfigPage } from "@/pages/raw-config";
import { SiteDetailPage } from "@/pages/site-detail";
import { SitesPage } from "@/pages/sites";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "sites", element: <SitesPage /> },
        { path: "sites/:serverId", element: <SiteDetailPage /> },
        { path: "upstreams", element: <UpstreamsPage /> },
        { path: "tls", element: <TlsPage /> },
        { path: "global", element: <GlobalConfigPage /> },
        { path: "config", element: <RawConfigPage /> },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  {
    basename: "/ui",
  },
);
