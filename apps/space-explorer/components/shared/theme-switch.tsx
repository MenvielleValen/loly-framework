import { useTheme } from "@lolyjs/core/themes";
import { Switch } from "@/components/ui/switch";

export const ThemeSwitch = () => {
  const { theme, handleThemeChange } = useTheme();

  const handleSwitch = (checked: boolean) => {
    handleThemeChange(checked ? "dark" : "light");
  };

  return <Switch checked={theme === "dark"} onCheckedChange={handleSwitch} />;
};

