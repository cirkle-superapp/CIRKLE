"use client";

/**
 * DEPRECATED — replaced by IconDock (`./icon-dock.tsx`) in Task 12.
 *
 * The Facebook-style text left-sidebar has been retired in favor of the slim
 * icon dock on the left edge. This file is kept only to satisfy any potential
 * historical imports; `app-shell.tsx` no longer imports it.
 *
 * If you need a left navigation, use `<IconDock onOpenChat={...} />`.
 */

export function LeftSidebar() {
  return null;
}
