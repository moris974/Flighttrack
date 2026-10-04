"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, Inbox, LogOut, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const ITEMS = [
  { href: "/settings", label: "Impostazioni", icon: Settings },
  { href: "/import", label: "Voli da confermare", icon: Inbox },
];

export default function MorePage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-xl font-semibold mb-4">Altro</h1>

      <div className="bg-base-900 border border-base-700 rounded-2xl divide-y divide-base-700 overflow-hidden">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center justify-between p-4">
            <span className="flex items-center gap-3">
              <Icon size={18} className="text-gray-400" />
              {label}
            </span>
            <ChevronRight size={18} className="text-gray-500" />
          </Link>
        ))}

        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 text-red-400">
          <LogOut size={18} />
          Esci
        </button>
      </div>
    </main>
  );
}
