"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Menu Utama",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/properties", label: "Listing & Iklan", icon: Megaphone },
      { href: "/dashboard/leads", label: "Minat Pembeli", icon: Users },
      { href: "/dashboard/analytics", label: "Statistik Portofolio", icon: TrendingUp },
    ],
  },
  {
    label: "Komunikasi",
    items: [{ href: "/dashboard/messages", label: "Pesan WhatsApp", icon: MessageSquare }],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/dashboard/settings", label: "Pengaturan Akun", icon: Settings },
      { href: "/dashboard/help", label: "Bantuan & FAQ", icon: HelpCircle },
    ],
  },
];

// Checks whether a dashboard link matches the route; the overview only matches exactly.
function isActiveRoute(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

// Renders the signed-in seller's identity and the logout action at the bottom of the sidebar.
function SidebarAccount() {
  const { user, logout } = useAuth();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary text-primary-foreground uppercase">
              {user?.name ? user.name.charAt(0) : "S"}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{user?.name ?? "Penjual"}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.email ?? "Penjual"}</span>
          </div>
        </div>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={logout}>
          <LogOut />
          <span>Keluar</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Renders the seller portal sidebar with grouped navigation and account actions.
export function DashboardSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // Closes the mobile sheet once a destination is chosen.
  const handleNavigate = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/"
          onClick={handleNavigate}
          aria-label="EstateVerse — ke website"
          className="rounded-lg px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Logo size="sm" tagline="Portal Penjual" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActiveRoute(pathname, item.href)}
                      onClick={handleNavigate}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarAccount />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
