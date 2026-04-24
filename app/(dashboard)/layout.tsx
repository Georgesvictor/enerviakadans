import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Home, FilePlus, Files, Settings, Link as LinkIcon } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-enervia-50">
      <aside className="hidden md:flex md:w-64 flex-col border-r border-enervia-100 bg-white">
        <div className="p-6 border-b border-enervia-100">
          <Image
            src="/enervia-logo.svg"
            alt="Enervia"
            width={180}
            height={36}
            priority
          />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" icon={Home} label="Overzicht" />
          <NavLink href="/dashboard/nieuw" icon={FilePlus} label="Nieuw dossier" />
          <NavLink href="/dashboard/dossiers" icon={Files} label="Dossiers" />
          <NavLink href="/dashboard/teamleader" icon={LinkIcon} label="Teamleader" />
          <NavLink href="/dashboard/instellingen" icon={Settings} label="Instellingen" />
        </nav>
        <div className="p-4 text-xs text-muted-foreground border-t border-enervia-100">
          simulatie.enervia.be · v1.0
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-enervia-100">
          <h1 className="text-lg font-semibold text-enervia-500">
            Simulatie Portal
          </h1>
          <UserButton
            appearance={{ variables: { colorPrimary: "#1F4D3F" } }}
          />
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-enervia-600 hover:bg-enervia-50 transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
