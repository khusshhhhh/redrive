"use client";

import React from "react";

interface MenuItemProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode; // ✅ New prop to accept an icon
}

const MenuItem: React.FC<MenuItemProps> = ({ onClick, label, icon }) => {
  return (
    <div
      onClick={onClick}
      role="menuitem"
      tabIndex={0}
      className="flex items-center gap-3 px-6 py-4 hover:bg-surface-soft transition cursor-pointer text-ink"
    >
      {icon && <span className="text-muted">{icon}</span>} {/* ✅ Show icon if provided */}
      <span className="font-medium">{label}</span>
    </div>
  );
};

export default MenuItem;
