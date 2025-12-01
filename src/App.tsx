import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

function App() {
  const [category, setCategory] = useState("caches")

  return (
    <SidebarProvider>
      <AppSidebar selectedCategory={category} onSelectCategory={setCategory} />
      <main className="flex-1 p-6">
        <h1>Selected: {category}</h1>
      </main>
    </SidebarProvider>
  )
}

export default App
