import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Hydration-safe "has the client mounted?" flag.
 * Server + first client paint return false; afterward true.
 * Used with next-themes so theme-dependent UI doesn't mismatch SSR HTML.
 */
export function useIsMounted() {
  return useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
}
