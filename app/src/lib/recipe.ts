import { useCallback, useEffect, useMemo, useState } from "react";
import { replaceParams } from "@/lib/router";

export interface RecipeCodec<T extends object> {
  encode(state: T): string;
  decode(encoded: string): Partial<T>;
  toUrl(state: T): string;
  toCode(state: T): string;
}

const equal = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => equal(value, b[index]));
  }
  return Object.is(a, b);
};

function validValue(value: unknown, reference: unknown): boolean {
  if (reference === null) return value === null;
  if (Array.isArray(reference)) {
    if (!Array.isArray(value)) return false;
    return value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
  }
  return typeof value === typeof reference && ["string", "number", "boolean"].includes(typeof value);
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function createRecipe<T extends object>(toolId: string, defaults: T): RecipeCodec<T> {
  const encode = (state: T) => {
    const delta: Partial<T> = {};
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      if (!equal(state[key], defaults[key])) delta[key] = state[key];
    }
    return Object.keys(delta).length ? encodeBase64Url(JSON.stringify(delta)) : "";
  };
  const decode = (encoded: string): Partial<T> => {
    if (!encoded) return {};
    try {
      const parsed: unknown = JSON.parse(decodeBase64Url(encoded));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const safe: Partial<T> = {};
      for (const key of Object.keys(defaults) as (keyof T)[]) {
        const value = (parsed as Record<keyof T, unknown>)[key];
        if (Object.prototype.hasOwnProperty.call(parsed, key) && validValue(value, defaults[key])) {
          safe[key] = value as T[keyof T];
        }
      }
      return safe;
    } catch {
      return {};
    }
  };
  const hash = (state: T) => {
    const payload = encode(state);
    return `#/t/${toolId}${payload ? `?r=${encodeURIComponent(payload)}` : ""}`;
  };
  return {
    encode,
    decode,
    toUrl: (state) => typeof window === "undefined" ? hash(state)
      : `${window.location.origin}${window.location.pathname}${hash(state)}`,
    toCode: (state) => `termcraft:v1:${encode(state)}`,
  };
}

export function useRecipe<T extends object>(
  toolId: string,
  defaults: T,
  params: URLSearchParams,
): [T, (patch: Partial<T>) => void, { shareUrl: string; shareCode: string; reset: () => void }] {
  const defaultsKey = JSON.stringify(defaults);
  // Callers commonly declare defaults inline. Keying by their value prevents
  // a new object identity from resetting state on every render.
  const stableDefaults = useMemo(() => defaults, [defaultsKey]);
  const codec = useMemo(() => createRecipe(toolId, stableDefaults), [toolId, stableDefaults]);
  const recipeParam = params.get("r") ?? "";
  const [state, setState] = useState<T>(() => ({ ...stableDefaults, ...codec.decode(recipeParam) }));

  useEffect(() => {
    setState({ ...stableDefaults, ...codec.decode(recipeParam) });
  }, [codec, stableDefaults, recipeParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      const encoded = codec.encode(state);
      if (encoded) next.set("r", encoded);
      else next.delete("r");
      replaceParams(next);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [codec, params, state]);

  const patch = useCallback((next: Partial<T>) => setState((current) => ({ ...current, ...next })), []);
  const reset = useCallback(() => setState({ ...stableDefaults }), [stableDefaults]);
  return [state, patch, { shareUrl: codec.toUrl(state), shareCode: codec.toCode(state), reset }];
}
