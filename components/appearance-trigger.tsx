"use client";

import { useAppearance } from "./appearance-provider";
import { Icon } from "./icons";

export function AppearanceTrigger() {
  const { panelOpen, openPanel } = useAppearance();

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={openPanel}
      aria-label="自定义背景和配色"
      aria-expanded={panelOpen}
      title="背景与配色"
    >
      <Icon name="palette" size={17} />
    </button>
  );
}