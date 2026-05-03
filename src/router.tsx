/**
 * Application router configuration.
 */

import { createBrowserRouter } from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard";
import { LoggingPage } from "@/pages/logging";
import { GlobalConfigPage, NotFoundPage } from "@/pages/placeholder";
import { RawConfigPage } from "@/pages/raw-config";
import { SiteDetailPage } from "@/pages/site-detail";
import { SitesPage } from "@/pages/sites";
import { TemplatesPage } from "@/pages/templates";
import { TlsPage } from "@/pages/tls";
import { UpstreamsPage } from "@/pages/upstreams";

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
        { path: "logging", element: <LoggingPage /> },
        { path: "templates", element: <TemplatesPage /> },
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
