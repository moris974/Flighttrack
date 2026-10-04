"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plane, Building2, Map, MoreHorizontal } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/flights", label: "Voli", icon: Plane },
  { href: "/airport", label: "Aeroporto", icon: Building2 },
  { href: "/map", label: "Mappe", icon: Map },
  { href: "/more", label: "Altro", icon: MoreHorizontal },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/login") || pathname.startsWith("/share")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-base-900 border-t border-base-700 flex justify-around py-2 z-20">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 text-xs ${
              active ? "text-accent-teal" : "text-gray-400"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
