/**
 * Hash router.
 *
 * Termcraft is a static site with no server, so it has to work when dropped
 * on GitHub Pages or opened straight off disk. Hash routing needs no rewrite
 * rules and no base path — everything after `#` is ours.
 *
 * Routes:
 *   #/                       landing page
 *   #/t/<toolId>             a tool
 *   #/t/<toolId>?r=<recipe>  a tool with saved settings applied
 */

import { useEffect, useState } from "react";
import { isToolId, type ToolId } from "@/tools/registry";

export type Route =
  | { name: "home" }
  | { name: "tool"; tool: ToolId; params: URLSearchParams };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [pathPart, queryPart = ""] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);

  if (segments[0] === "t" && segments[1] && isToolId(segments[1])) {
    return {
      name: "tool",
      tool: segments[1],
      params: new URLSearchParams(queryPart),
    };
  }

  return { name: "home" };
}

export function currentRoute(): Route {
  return parseHash(window.location.hash);
}

export function toolHref(tool: ToolId, params?: URLSearchParams): string {
  const query = params?.toString();
  return `#/t/${tool}${query ? `?${query}` : ""}`;
}

export const HOME_HREF = "#/";

export function navigate(href: string) {
  if (window.location.hash === href) return;
  window.location.hash = href;
}

/**
 * Replace the query string on the current tool route without adding a history
 * entry. Used to keep the shareable recipe in the URL as settings change.
 */
export function replaceParams(params: URLSearchParams) {
  const route = currentRoute();
  if (route.name !== "tool") return;
  const query = params.toString();
  const href = `#/t/${route.tool}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", href);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

/** Scroll to top whenever the route changes. */
export function useScrollReset(key: string) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [key]);
}
