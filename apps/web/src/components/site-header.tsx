"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logoMark from "@/assets/logo-mark-3.png";
import nacosMark from "@/assets/nacos-logo.png";

type SiteHeaderProps = { className?: string };

export function SiteHeader({ className = "" }: SiteHeaderProps) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const hasAdminSidebar = isAdminPage && pathname !== "/admin/login";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 bg-white/45 backdrop-blur ${hasAdminSidebar ? "lg:left-(--admin-sidebar-width)" : ""}`.trim()}
      >
        <div
          className={`mx-auto flex h-18.25 w-full items-center justify-between px-5 sm:px-0 ${hasAdminSidebar ? "max-w-none" : "max-w-6xl"} ${className}`.trim()}
        >
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="NACOS Vote home"
          >
            <Image
              src={logoMark}
              alt=""
              className="size-10 rounded-xl object-contain"
            />
            <Image
              src={nacosMark}
              alt=""
              className="size-10 rounded-xl object-contain"
            />
          </Link>
          <Link
            href={isAdminPage ? "/" : "/admin/login"}
            className="text-sm font-medium text-[#315954] underline-offset-4 hover:text-[#0e5a4f] hover:underline"
          >
            {isAdminPage ? "Student sign in" : "Admin sign in"}
          </Link>
        </div>
      </header>
      <div aria-hidden="true" className="h-18.25 shrink-0" />
    </>
  );
}
