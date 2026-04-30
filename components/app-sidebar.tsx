"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

// This is sample data.
export function AppSidebar({ view, setView, user, ...props }: any) {
  const data = {
    user: {
      name: user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuario",
      email: user?.email || "sin-email",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "GreenState",
        logo: GalleryVerticalEnd,
        plan: "Empresa",
      },
    ],
    navMain: [
      {
        title: "Playground",
        url: "#",
        icon: SquareTerminal,
        isActive: true,
        items: [
          { title: "History", url: "#" },
          { title: "Starred", url: "#" },
          { title: "Settings", url: "#" },
        ],
      },
      {
        title: "Models",
        url: "#",
        icon: Bot,
        items: [
          { title: "Genesis", url: "#" },
          { title: "Explorer", url: "#" },
          { title: "Quantum", url: "#" },
        ],
      },
      {
        title: "Documentation",
        url: "#",
        icon: BookOpen,
        items: [
          { title: "Introduction", url: "#" },
          { title: "Get Started", url: "#" },
          { title: "Tutorials", url: "#" },
          { title: "Changelog", url: "#" },
        ],
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2,
        items: [
          { title: "General", url: "#" },
          { title: "Team", url: "#" },
          { title: "Billing", url: "#" },
          { title: "Limits", url: "#" },
        ],
      },
    ],
    projects: [
      { name: "Design Engineering", url: "#", icon: Frame },
      { name: "Sales & Marketing", url: "#", icon: PieChart },
      { name: "Travel", url: "#", icon: Map },
    ],
  };

  return (
   <Sidebar
  defaultOpen
  collapsible="offcanvas"
  className="w-64 bg-card text-card-foreground border-r border-border"
>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent className="text-foreground">
        <div className="px-2 py-2 space-y-1">
          <button
            onClick={() => setView("reservations")}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
              view === "reservations"
                ? "bg-green-600 text-white"
                : "hover:bg-muted text-foreground"
            }`}
          >
            📊
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setView("documentacion")}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
              view === "documentacion"
                ? "bg-green-600 text-white"
                : "hover:bg-muted text-foreground"
            }`}
          >
            📁
            <span>Documentación</span>
          </button>
        </div>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter className="text-foreground">
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
