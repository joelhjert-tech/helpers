import { toolApps, toolAppsByRoute } from "../../apps/toolRegistry";

export const LAUNCHER_ROUTE = "/";

export function normalizeToolPath(pathname = LAUNCHER_ROUTE) {
  const cleanPath = String(pathname || LAUNCHER_ROUTE).replace(/\/+$/, "") || LAUNCHER_ROUTE;
  return cleanPath === "" ? LAUNCHER_ROUTE : cleanPath;
}

export function getToolAppByPath(pathname = LAUNCHER_ROUTE) {
  return toolAppsByRoute.get(normalizeToolPath(pathname)) ?? null;
}

export function routeForToolApp(app) {
  return app?.route ?? LAUNCHER_ROUTE;
}

export { toolApps };
