import type { ComponentType } from "react";

/**
 * Shared shape for an icon component. lucide-react icons, @tabler/icons-react
 * icons, and small local SVG components (GoogleIcon) all satisfy this, so
 * component props can accept "an icon" without importing a specific library's
 * type.
 */
export type IconComponent = ComponentType<{
  size?: number | string;
  className?: string;
  stroke?: number | string;
}>;
