'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      aria-label="Toggle Theme"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-full border hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {theme === 'light' ? <FaMoon /> : <FaSun />}
    </button>
  );
};

export default ThemeSwitcher;
