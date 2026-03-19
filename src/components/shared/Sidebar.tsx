import Link from "next/link";
import packageJson from "../../../package.json";
import { useState } from "react";
import { sidebarNavs } from "@/config/constants/sidebarNavs";
import { cn } from "@/lib/utils";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronLeft, ChevronRight, Languages } from "lucide-react";

import dynamic from "next/dynamic";
import ProfileInfo from "./ProfileInfo";
import ChangelogDialog from "./ChangelogDialog";

const ThemeSwitcher = dynamic(() => import("@/components/shared/ThemeSwitcher"), {
  ssr: false,
});

export default function Sidebar() {
  const router = useRouter();
  const { pathname } = router;
  const [collapsed, setCollapsed] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const { lang, setLang } = useLanguage();

  return (
    <div className={cn("hidden border-r bg-muted/40 md:block max-h-screen min-h-screen transition-all duration-300 relative", collapsed ? "w-[60px]" : "w-[200px] lg:w-[240px]")}>
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-12 items-center justify-between border-b px-2 lg:px-4">
          <Link href="/" className={cn("flex items-center gap-2 font-semibold", collapsed && "justify-center")}>
            <img
              src="/favicon.png"
              width={26}
              height={26}
              alt="Immich Power Tools"
              className={cn("w-6 h-6", collapsed && "mx-auto")}
            />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm leading-tight">Power Tools</span>
                <button
                  onClick={(e) => { e.preventDefault(); setChangelogOpen(true); }}
                  className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-md font-mono w-fit hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  title="View changelog"
                >
                  v{packageJson.version}
                </button>
              </div>
            )}
          </Link>
        </div>
        <div className="flex-1 mt-2">
          <nav className={cn("grid items-start gap-1 font-medium", collapsed ? "px-2" : "px-2 lg:px-4")}>
            {sidebarNavs.map((nav) => (
              <Link
                key={nav.title}
                href={nav.link}
                className={cn(
                  "flex items-center gap-3 rounded-lg py-2 transition-all hover:text-primary",
                  collapsed ? "justify-center px-0 hover:bg-muted" : "px-3",
                  pathname === nav.link ? "text-primary bg-muted/50" : "text-muted-foreground"
                )}
                title={collapsed ? nav.title : undefined}
              >
                {nav.icon}
                {!collapsed && <span>{nav.title}</span>}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="p-3 border-t flex flex-col gap-3">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
             {!collapsed && <span className="text-xs text-muted-foreground">Language / Idioma</span>}
             <button 
               onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
               className="p-1.5 hover:bg-muted rounded-md flex items-center gap-2 transition-colors"
               title="Toggle Language"
             >
               <Languages size={16} className="text-muted-foreground" />
               {!collapsed && <span className="text-xs font-medium uppercase">{lang}</span>}
             </button>
          </div>
          
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            {!collapsed && <ThemeSwitcher />}
            {collapsed && <ThemeSwitcher />}
          </div>

          <div className="flex items-center justify-center border-t pt-2">
             <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-muted text-muted-foreground rounded-md w-full flex justify-center">
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
             </button>
          </div>

          {!collapsed && <ProfileInfo />}
        </div>
      </div>
      <ChangelogDialog open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </div>
  );
}
