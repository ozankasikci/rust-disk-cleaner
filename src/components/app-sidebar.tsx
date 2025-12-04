import { HardDrive, FolderCode, FileBox, Trash2, Sparkles, Download, Copy, FileText, AppWindow } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { SettingsPopover } from "./settings-popover"
import { formatBytes } from "@/lib/format"
import type { CategoryId } from "@/types"

interface CategoryStats {
  itemCount: number
  totalSize: number
}

interface AppSidebarProps {
  selectedCategory: CategoryId
  onSelectCategory: (category: CategoryId) => void
  stats: Record<CategoryId, CategoryStats | null>
}

const categories = [
  {
    id: "caches" as const,
    title: "Caches",
    description: "Temp files",
    icon: HardDrive,
  },
  {
    id: "dev-artifacts" as const,
    title: "Dev Artifacts",
    description: "Build outputs",
    icon: FolderCode,
  },
  {
    id: "large-files" as const,
    title: "Large Files",
    description: "> 100 MB",
    icon: FileBox,
  },
  {
    id: "downloads" as const,
    title: "Downloads",
    description: "Old downloads",
    icon: Download,
  },
  {
    id: "duplicates" as const,
    title: "Duplicates",
    description: "Identical files",
    icon: Copy,
  },
  {
    id: "old-logs" as const,
    title: "Old Logs",
    description: "Log files",
    icon: FileText,
  },
  {
    id: "unused-apps" as const,
    title: "Unused Apps",
    description: "Rarely opened",
    icon: AppWindow,
  },
]

function SizeIndicator({ size }: { size: number }) {
  const formatted = formatBytes(size)
  const sizeClass = size > 1_000_000_000 ? "text-destructive" :
                    size > 100_000_000 ? "text-amber-500" :
                    "text-primary"

  return (
    <span className={`text-mono-small font-medium ${sizeClass}`}>
      {formatted}
    </span>
  )
}

export function AppSidebar({ selectedCategory, onSelectCategory, stats }: AppSidebarProps) {
  // Calculate total reclaimable space
  const totalReclaimable = Object.values(stats)
    .filter((s): s is CategoryStats => s !== null)
    .reduce((sum, s) => sum + s.totalSize, 0)

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="icon-container-md bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">RustDiskCleaner</h1>
            <p className="text-label">
              Space Manager
            </p>
          </div>
        </div>
      </SidebarHeader>

      {totalReclaimable > 0 && (
        <div className="mx-3 mb-3 rounded-lg bg-primary/5 px-3 py-2.5 border border-primary/10">
          <p className="text-label mb-1">
            Reclaimable
          </p>
          <p className="text-mono-value text-lg text-primary">
            {formatBytes(totalReclaimable)}
          </p>
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-label px-3 mb-1">
            Scan Categories
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3 p-3">
              {categories.map((category) => {
                const stat = stats[category.id]
                const isActive = selectedCategory === category.id
                return (
                  <SidebarMenuItem key={category.id} className="stagger-item">
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onSelectCategory(category.id)}
                      className={`
                        group relative justify-between rounded-lg px-3 h-12 transition-all duration-200
                        ${isActive ? 'bg-accent shadow-sm' : 'hover:bg-accent/50'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          icon-container-md shrink-0 rounded-md transition-colors
                          ${isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:text-foreground'}
                        `}>
                          <category.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{category.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {stat && stat.itemCount > 0
                              ? `${stat.itemCount} items`
                              : category.description}
                          </span>
                        </div>
                      </div>
                      {stat && stat.itemCount > 0 && (
                        <SizeIndicator size={stat.totalSize} />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={selectedCategory === "trash"}
              onClick={() => onSelectCategory("trash")}
              className={`
                group justify-between rounded-lg px-3 h-12 transition-all duration-200
                ${selectedCategory === "trash" ? 'bg-accent shadow-sm' : 'hover:bg-accent/50'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  icon-container-md shrink-0 rounded-md transition-colors
                  ${selectedCategory === "trash" ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground group-hover:text-foreground'}
                `}>
                  <Trash2 className="h-4 w-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Trash</span>
                  <span className="text-xs text-muted-foreground">
                    {stats.trash && stats.trash.itemCount > 0
                      ? `${stats.trash.itemCount} items`
                      : "Empty"}
                  </span>
                </div>
              </div>
              {stats.trash && stats.trash.itemCount > 0 && (
                <SizeIndicator size={stats.trash.totalSize} />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center justify-between px-2 pt-2 border-t border-sidebar-border">
          <span className="text-[10px] text-muted-foreground">v1.0.0</span>
          <SettingsPopover />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
