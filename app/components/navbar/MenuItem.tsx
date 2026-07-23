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
      className="flex items-center gap-3 px-8 py-5 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition font-semibold cursor-pointer text-black dark:text-neutral-100"
    >
      {icon && <span className="text-gray-600 dark:text-neutral-300">{icon}</span>} {/* ✅ Show icon if provided */}
      <span className="font-medium">{label}</span>
    </div>
  );
};

export default MenuItem;
