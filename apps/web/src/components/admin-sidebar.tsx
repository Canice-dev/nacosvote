"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronsUpDown,
  CircleQuestionMark,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeft,
  PanelRight,
  UserCog,
  UserRoundPlus,
  Users,
  Vote,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import logoMark from "@/assets/logo-mark-2.png";

const navigation: ReadonlyArray<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: "Overview", href: "/admin", icon: LayoutGrid },
  { label: "Election setup", href: "/admin/election-setup", icon: Vote },
  { label: "Voter register", href: "/admin/voter-register", icon: Users },
  {
    label: "Positions & candidates",
    href: "/admin/candidates",
    icon: UserRoundPlus,
  },
  { label: "Schedule & controls", href: "/admin/schedule", icon: CalendarDays },
  { label: "Results", href: "/admin/results", icon: BarChart3 },
  { label: "Audit log", href: "/admin/audit-log", icon: ClipboardList },
  { label: "Admin accounts", href: "/admin/accounts", icon: UserCog },
];

type AdminSidebarProps = { username: string; email: string; initials: string };

function applySidebarWidth(collapsed: boolean) {
  document.documentElement.style.setProperty(
    "--admin-sidebar-width",
    collapsed ? "4.5rem" : "16.75rem",
  );
}

function SidebarContent({
  username,
  email,
  initials,
  collapsed,
  onNavigate,
  onToggle,
}: AdminSidebarProps & {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    function closeAccountMenu(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    }
    document.addEventListener("mousedown", closeAccountMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeAccountMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function logOut() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <>
      <div
        className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggle ?? onNavigate}
            aria-label="Expand navigation"
            className="group relative grid size-10 place-items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#176356]"
            title="Expand navigation"
          >
            <Image
              src={logoMark}
              alt=""
              className="size-10 rounded-xl object-contain transition group-hover:opacity-0"
              priority
            />
            <PanelRight
              className="pointer-events-none absolute size-5 text-[#174f47] opacity-0 transition group-hover:opacity-100"
              aria-hidden="true"
            />
          </button>
        ) : (
          <>
            <Link
              href="/"
              aria-label="NACOSVote overview"
              className="flex items-center gap-3"
              onClick={onNavigate}
            >
              <Image
                src={logoMark}
                alt=""
                className="size-10 rounded-xl object-contain"
                priority
              />
              <span className="text-sm font-semibold tracking-tight">
                NACOSVote
              </span>
            </Link>
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                aria-label="Collapse navigation"
                className="grid size-9 place-items-center rounded-lg text-[#60706b] transition hover:bg-[#e9eeeb] hover:text-[#174f47]"
                title="Collapse navigation"
              >
                <PanelLeft className="size-4.5" aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </div>
      <nav
        className={`mt-7 space-y-1 ${collapsed ? "px-1" : ""}`}
        aria-label="Admin navigation"
      >
        {navigation.map(({ label, href, icon: NavIcon }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              aria-label={label}
              title={collapsed ? label : undefined}
              className={`group relative flex items-center rounded-lg py-2.5 text-sm transition-colors ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-[#e9f1ee] font-semibold text-[#164e46]" : "text-[#656c68] hover:bg-[#eeeeeb] hover:text-[#303634]"}`}
            >
              <NavIcon
                className="size-4.5 shrink-0"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+0.65rem)] z-70 hidden whitespace-nowrap rounded-md bg-[#233a35] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div
        className={`mt-auto border-t border-[#e3e4e0] pt-5 ${collapsed ? "px-1" : ""}`}
      >
        <a
          href="#"
          onClick={onNavigate}
          aria-label="Help and security"
          title={collapsed ? "Help and security" : undefined}
          className={`flex items-center rounded-lg py-2.5 text-sm text-[#656c68] hover:bg-[#eeeeeb] ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}
        >
          <CircleQuestionMark
            className="size-4.5 shrink-0"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          {!collapsed && "Help & Support"}
        </a>
        <div
          className={`mt-3 flex items-center rounded-lg py-2 hover:bg-[#eeeeeb] ${collapsed ? "justify-center" : "gap-3 px-3"}`}
          title={collapsed ? username : undefined}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e84e3c] text-xs font-medium text-white">
            {initials}
          </span>
          {!collapsed && (
            <div ref={accountMenuRef} className="relative min-w-0 flex-1">
              <button
                type="button"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md text-left  outline-none focus-visible:ring-2 focus-visible:ring-[#176356]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[#333936]">
                    {username}
                  </span>
                  <span className="block truncate text-xs text-[#858b87]">
                    {email}
                  </span>
                </span>
                <span className="flex shrink-0 items-center justify-center">
                  <ChevronsUpDown
                    className={`size-4.5 shrink-0 transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {isAccountMenuOpen && (
                <div
                  role="menu"
                  aria-label="Account options"
                  className="absolute bottom-[calc(100%+0.75rem)] -left-16.75 z-70 w-62.5 rounded-2xl border border-[#dde3df] bg-white p-1.5"
                >
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e84e3c] text-xs font-medium text-white">
                      {initials}
                    </span>
                    <span>
                      <p className="truncate text-sm font-semibold text-[#303634]">
                        {username}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#7d8580]">
                        {email}
                      </p>
                    </span>
                  </div>
                  <div className="my-1 border-t border-[#e8ebe8]" />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isLoggingOut}
                    onClick={logOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#bd3f31] transition hover:bg-[#fff1ee] disabled:cursor-wait disabled:opacity-70"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    {isLoggingOut ? "Logging out…" : "Log out"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function AdminSidebar(props: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  useEffect(() => {
    const saved = window.localStorage.getItem(
      "nacosvote-admin-sidebar-collapsed",
    );
    const collapsed =
      window.matchMedia("(max-width: 1279px)").matches || saved === "true";
    const frame = window.requestAnimationFrame(() => {
      setIsCollapsed(collapsed);
      applySidebarWidth(collapsed);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  function toggleSidebar() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    applySidebarWidth(next);
    window.localStorage.setItem(
      "nacosvote-admin-sidebar-collapsed",
      String(next),
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-60 grid size-10 place-items-center rounded-lg border border-[#e6e6e3] bg-white text-[#174f47] shadow-sm lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-[#15231f]/35 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-60 flex w-72 flex-col border-r border-[#e6e6e3] bg-[#f8f8f7] px-5 py-6 shadow-xl transition-[transform,width,padding] duration-200 lg:translate-x-0 lg:shadow-none lg:max-xl:w-18 lg:max-xl:px-2 ${isCollapsed ? "xl:w-18 xl:px-2" : "xl:w-67 xl:px-5"} ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-md text-[#59645f] hover:bg-[#e9eeeb] lg:hidden"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <div className="flex min-h-full flex-col lg:hidden">
          <SidebarContent
            {...props}
            collapsed={false}
            onNavigate={() => setIsOpen(false)}
          />
        </div>
        <div className="hidden min-h-full flex-col lg:flex">
          <SidebarContent
            {...props}
            collapsed={isCollapsed}
            onToggle={toggleSidebar}
          />
        </div>
      </aside>
    </>
  );
}
