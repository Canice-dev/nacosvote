"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import logoMark from "@/assets/logo-mark-2.png";

const navigation = [
  ["Overview", "home", "/admin"],
  ["Election setup", "election", "/admin/election-setup"],
  ["Voter register", "users", "/admin/voter-register"],
  ["Positions & candidates", "candidates", "/admin/candidates"],
  ["Schedule & controls", "calendar", "/admin/schedule"],
  ["Results", "results", "/admin/results"],
  ["Audit log", "audit", "/admin/audit-log"],
  ["Admin accounts", "account", "/admin/accounts"],
] as const;

type IconName = (typeof navigation)[number][1] | "shield" | "menu" | "close";

function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
    ),
    election: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 3v4m8-4v4M7 11h10m-7 4h4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87m-2-12a4 4 0 0 1 0 7.75" />
      </>
    ),
    candidates: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-1a7 7 0 0 1 14 0v1M16 4h6m-3-3v6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </>
    ),
    results: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
    audit: (
      <>
        <path d="M5 3h11l3 3v15H5Z" />
        <path d="M16 3v4h4M8 12h8M8 16h6" />
      </>
    ),
    account: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function SidebarContent({
  username,
  email,
  initials,
  onNavigate,
}: AdminSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/admin"
        className="flex items-center gap-3 px-2"
        onClick={onNavigate}
      >
        <Image
          src={logoMark}
          alt=""
          className="size-10 rounded-xl object-contain"
        />
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          NACOSVote
        </span>
      </Link>
      <nav className="mt-7 space-y-1" aria-label="Admin navigation">
        {navigation.map(([label, icon, href]) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${active ? "bg-[#e9f1ee] font-semibold text-[#164e46]" : "text-[#656c68] hover:bg-[#eeeeeb] hover:text-[#303634]"}`}
            >
              <Icon name={icon} className="size-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[#e3e4e0] pt-5">
        <a
          href="#"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#656c68] hover:bg-[#eeeeeb]"
        >
          <Icon name="shield" className="size-4.5" />
          Help & security
        </a>
        <div className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left">
          <span className="grid size-8 place-items-center rounded-full bg-[#d9e7e2] text-xs font-semibold text-[#1c554c]">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-[#333936]">
              {username}
            </span>
            <span className="block truncate text-xs text-[#858b87]">
              {email}
            </span>
          </span>
        </div>
      </div>
    </>
  );
}

type AdminSidebarProps = { username: string; email: string; initials: string };

export function AdminSidebar(props: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-60 grid size-10 place-items-center rounded-lg bg-white text-[#174f47]  lg:hidden"
      >
        <Icon name="menu" className="size-10" />
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
        className={`fixed inset-y-0 left-0 z-60 flex w-72 flex-col border-r border-[#e6e6e3] bg-[#f8f8f7] px-5 py-6 shadow-xl transition-transform duration-200 lg:w-67 lg:translate-x-0 lg:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-md text-[#59645f] hover:bg-[#e9eeeb] lg:hidden"
        >
          <Icon name="close" className="size-5" />
        </button>
        <SidebarContent {...props} onNavigate={() => setIsOpen(false)} />
      </aside>
    </>
  );
}
