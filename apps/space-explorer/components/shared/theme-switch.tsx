import { useTheme } from "@loly/core/themes";
import { Switch } from "@/components/ui/switch";

export const ThemeSwitch = () => {
  const { theme, handleThemeChange } = useTheme();

  const handleSwitch = () => {
    handleThemeChange(theme === "light" ? "dark" : "light");
  };

  return <Switch onClick={handleSwitch} />;
};

