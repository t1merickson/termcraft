import { useEffect, useRef } from "react";

/**
 * Loads one built-in sample the first time a tool mounts, so the image tools
 * open with something already converted instead of an empty drop zone.
 *
 * Failing is fine and silent: if the sample is missing the tool just shows its
 * normal empty state.
 */
export function useDefaultSample(
  loadFromUrl: (src: string, name?: string) => Promise<unknown>,
  sample: { id: string; name: string },
) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    loadFromUrl(
      `${import.meta.env.BASE_URL}samples/${sample.id}.png`,
      sample.name,
    ).catch(() => {});
  }, [loadFromUrl, sample.id, sample.name]);
}
