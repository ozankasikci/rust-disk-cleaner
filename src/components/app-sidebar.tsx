import { HardDrive, FolderCode } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const categories = [
  { id: "caches", title: "Caches", icon: HardDrive },
  { id: "dev-artifacts", title: "Dev Artifacts", icon: FolderCode },
]

interface AppSidebarProps {
  selectedCategory: string
  onSelectCategory: (id: string) => void
}

export function AppSidebar({ selectedCategory, onSelectCategory }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((cat) => (
                <SidebarMenuItem key={cat.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectCategory(cat.id)}
                    isActive={selectedCategory === cat.id}
                  >
                    <cat.icon className="h-4 w-4" />
                    <span>{cat.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
