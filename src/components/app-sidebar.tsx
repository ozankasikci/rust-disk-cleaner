import {
  HardDrive,
  FolderCode,
  FileBox,
  Download,
  Copy,
  FileText,
  AppWindow,
  Trash2,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { SettingsPopover } from "./settings-popover"
import { formatBytes } from "@/lib/format"
import type { CategoryId } from "@/types"

const categories = [
  { id: "caches" as CategoryId, title: "Caches", icon: HardDrive },
  { id: "dev-artifacts" as CategoryId, title: "Dev Artifacts", icon: FolderCode },
  { id: "large-files" as CategoryId, title: "Large Files", icon: FileBox },
  { id: "downloads" as CategoryId, title: "Downloads", icon: Download },
  { id: "duplicates" as CategoryId, title: "Duplicates", icon: Copy },
  { id: "old-logs" as CategoryId, title: "Old Logs", icon: FileText },
  { id: "unused-apps" as CategoryId, title: "Unused Apps", icon: AppWindow },
  { id: "trash" as CategoryId, title: "Trash", icon: Trash2 },
]

interface CategoryStats {
  itemCount: number
  totalSize: number
}

interface AppSidebarProps {
  selectedCategory: CategoryId
  onSelectCategory: (category: CategoryId) => void
  stats: Record<CategoryId, CategoryStats | null>
}

export function AppSidebar({ selectedCategory, onSelectCategory, stats }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((cat) => {
                const catStats = stats[cat.id]
                return (
                  <SidebarMenuItem key={cat.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectCategory(cat.id)}
                      isActive={selectedCategory === cat.id}
                    >
                      <cat.icon className="h-4 w-4" />
                      <span className="flex-1">{cat.title}</span>
                      {catStats && (
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(catStats.totalSize)}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SettingsPopover />
      </SidebarFooter>
    </Sidebar>
  )
}
