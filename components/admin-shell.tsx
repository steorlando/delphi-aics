"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AdminShellProps = {
  adminLinks: Array<{
    href: string;
    label: string;
  }>;
  children: React.ReactNode;
  fullName: string;
};

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function AdminShell({ adminLinks, children, fullName }: AdminShellProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(pathname !== "/admin");

  useEffect(() => {
    setIsCollapsed(pathname !== "/admin");
  }, [pathname]);

  return (
    <div className={`admin-shell${isCollapsed ? " admin-shell-collapsed" : ""}`}>
      <aside className={`panel-card admin-sidebar${isCollapsed ? " admin-sidebar-collapsed" : ""}`}>
        <button
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Espandi menu amministrativo" : "Comprimi menu amministrativo"}
          className="admin-sidebar-toggle"
          onClick={() => setIsCollapsed((current) => !current)}
          type="button"
        >
          <MenuIcon />
          <span className="sr-only">
            {isCollapsed ? "Apri menu amministrativo" : "Chiudi menu amministrativo"}
          </span>
        </button>

        {!isCollapsed ? (
          <>
            <span className="eyebrow">Spazio amministrativo</span>
            <h2>{fullName}</h2>
            <nav className="admin-sidebar-nav" aria-label="Sezioni amministrative">
              {adminLinks.map((link) => {
                const isActive =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    className={`admin-sidebar-link${isActive ? " admin-sidebar-link-active" : ""}`}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </>
        ) : null}
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
