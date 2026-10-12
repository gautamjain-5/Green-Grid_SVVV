import { Link } from "@tanstack/react-router";
import logo from "@/assets/svvv-eco-logo.png";
import { cn } from "@/lib/utils";

export function Brand({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-3", className)}>
      <img src={logo} alt="EcoCampus emblem inspired by Shri Vaishnav Vidyapeeth Vishwavidyalaya" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full bg-card p-0.5 shadow-card transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3" />
      <span className="leading-tight">
        <span className={cn("block font-display text-lg font-semibold", light ? "text-sidebar-accent-foreground" : "text-foreground")}>Green-Grid_SVVV</span>
        <span className={cn("block text-[10px] tracking-wide", light ? "text-sidebar-foreground/70" : "text-muted-foreground")}>SVVV · Indore</span>
      </span>
    </Link>
  );
}
