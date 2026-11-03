import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <calcite-action
      icon={isDark ? 'brightness' : 'moon'}
      text={label}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    />
  );
}
