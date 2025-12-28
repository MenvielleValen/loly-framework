import { ThemeSwitcher } from "@components/ui/theme-switcher.client";
import { MobileMenu } from "./mobile-menu.client";

export const Header = ({ downloads }: { downloads: number | null }) => {
  return (
    <header>
      <ThemeSwitcher />
      <MobileMenu />
      <span data-downloads={downloads ?? undefined}>Header</span>
    </header>
  );
};

