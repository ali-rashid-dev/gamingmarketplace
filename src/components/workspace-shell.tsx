import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type WorkspaceNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function WorkspaceShell({
  children,
  homeHref,
  homeLabel,
  description,
  navigationLabel,
  navigation,
  footerTitle,
  footerDescription,
}: {
  children: React.ReactNode;
  homeHref: string;
  homeLabel: string;
  description: string;
  navigationLabel: string;
  navigation: WorkspaceNavigationItem[];
  footerTitle: string;
  footerDescription: string;
}) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-card md:flex md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="border-b border-border px-5 py-5">
          <Link href={homeHref} className="font-display text-xl font-semibold text-primary">
            {homeLabel}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <nav
          aria-label={navigationLabel}
          className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col"
        >
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-border p-4 md:block">
          <p className="text-xs font-medium text-foreground">{footerTitle}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {footerDescription}
          </p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
