import { useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CategoryView } from "@/components/category-view"

function App() {
  const [category, setCategory] = useState("caches")

  return (
    <SidebarProvider>
      <AppSidebar selectedCategory={category} onSelectCategory={setCategory} />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center gap-4 p-4 border-b">
          <SidebarTrigger />
          <h1 className="font-semibold capitalize">{category}</h1>
        </div>
        <div className="flex-1">
          <CategoryView category={category} />
        </div>
      </main>
    </SidebarProvider>
  )
}

export default App
