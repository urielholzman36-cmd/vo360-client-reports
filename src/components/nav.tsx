"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const links = [
  { href: "/", label: "Generate" },
  { href: "/history", label: "History" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="VO360" width={36} height={36} />
        <span className="text-lg font-bold text-white">Report Generator</span>
      </div>
      <div className="flex gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${
              pathname === link.href
                ? "text-vo360-orange font-medium"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
