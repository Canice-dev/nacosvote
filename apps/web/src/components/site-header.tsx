"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logoMark from "@/assets/logo-mark.png";

type SiteHeaderProps = {
  className?: string;
};

export function SiteHeader({ className = "" }: SiteHeaderProps) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  return (
    <header className={`flex items-center justify-between ${className}`.trim()}>
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
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          NACOS Vote
        </span>
      </Link>
      <Link
        href={isAdminPage ? "/" : "/admin/login"}
        className="text-sm font-medium text-[#315954] underline-offset-4 hover:text-[#0e5a4f] hover:underline"
      >
        {isAdminPage ? "Student sign in" : "Admin sign in"}
      </Link>
    </header>
  );
}
