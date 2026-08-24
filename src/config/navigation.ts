import {
  Home,
  Compass,
  Bell,
  MessageSquare,
  Users2,
  Bookmark,
  User as UserIcon,
  Terminal,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { UserRole } from "@/types";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "unreadCount" | "notifications";
  adminOnly?: boolean;
  requiresAuth?: boolean;
}

export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Pulse", href: "/notifications", icon: Bell, badgeKey: "unreadCount" },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Circles", href: "/circles", icon: Users2 },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { label: "Profile", href: "/profile", icon: UserIcon, requiresAuth: true },
];

export const SECONDARY_NAV_ITEMS: NavItemConfig[] = [
  { label: "Developer API", href: "/developer", icon: Terminal },
  { label: "Admin Console", href: "/admin", icon: ShieldAlert, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];
