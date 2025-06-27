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
      className="flex items-center gap-3 px-8 py-5 hover:bg-neutral-100 dark:hover:bg-gray-700 transition font-semibold cursor-pointer"
    >
      {icon && <span className="text-gray-600 dark:text-gray-300">{icon}</span>} {/* ✅ Show icon if provided */}
      <span className="font-medium text-black dark:text-white">{label}</span>
    </div>
  );
};

export default MenuItem;
