import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CategoryView } from "./category-view"
import * as tauriLib from "@/lib/tauri"

// Mock tauri functions
vi.mock("@/lib/tauri", () => ({
  scanCategory: vi.fn(),
  deleteItems: vi.fn(),
}))

// Mock tauri plugin opener
vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: vi.fn(),
}))

const mockScanCategory = vi.mocked(tauriLib.scanCategory)
const mockDeleteItems = vi.mocked(tauriLib.deleteItems)

describe("CategoryView", () => {
  const mockOnStatsUpdate = vi.fn()
  const mockOnScanDataUpdate = vi.fn()
  const mockOnScanningChange = vi.fn()

  const defaultProps = {
    category: "caches" as const,
    onStatsUpdate: mockOnStatsUpdate,
    scanData: null,
    onScanDataUpdate: mockOnScanDataUpdate,
    isScanning: false,
    onScanningChange: mockOnScanningChange,
  }

  const mockScanResult = {
    items: [
      { id: "1", path: "/path/to/cache1", size: 1000000, name: "npm", category: "caches", subcategory: "npm" },
      { id: "2", path: "/path/to/cache2", size: 2000000, name: "yarn", category: "caches", subcategory: "yarn" },
    ],
    total_size: 3000000,
    item_count: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockScanCategory.mockResolvedValue(mockScanResult)
    mockDeleteItems.mockResolvedValue({ deleted: 1, failed: [] })
  })

  describe("Initial render", () => {
    it("displays category title and description for caches", () => {
      render(<CategoryView {...defaultProps} category="caches" />)
      expect(screen.getByText("Caches")).toBeInTheDocument()
      expect(screen.getByText("System and application caches that can be safely removed.")).toBeInTheDocument()
    })

    it("displays category title and description for dev-artifacts", () => {
      render(<CategoryView {...defaultProps} category="dev-artifacts" />)
      expect(screen.getByText("Dev Artifacts")).toBeInTheDocument()
      expect(screen.getByText("Build outputs and dependency folders from development projects.")).toBeInTheDocument()
    })

    it("displays category title and description for large-files", () => {
      render(<CategoryView {...defaultProps} category="large-files" />)
      expect(screen.getByText("Large Files")).toBeInTheDocument()
      expect(screen.getByText("Files larger than 100MB that might be candidates for removal.")).toBeInTheDocument()
    })

    it("shows scan button when no data", () => {
      render(<CategoryView {...defaultProps} />)
      expect(screen.getByText("Ready to scan")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /scan caches/i })).toBeInTheDocument()
    })
  })

  describe("Scanning state", () => {
    it("shows loading state when scanning", () => {
      render(<CategoryView {...defaultProps} isScanning={true} />)
      expect(screen.getByText("Scanning...")).toBeInTheDocument()
      expect(screen.getByText(/looking for caches/i)).toBeInTheDocument()
    })

    it("calls scan when scan button is clicked", async () => {
      render(<CategoryView {...defaultProps} />)

      const scanButton = screen.getByRole("button", { name: /scan caches/i })
      fireEvent.click(scanButton)

      expect(mockOnScanningChange).toHaveBeenCalledWith("caches", true)
      await waitFor(() => {
        expect(mockScanCategory).toHaveBeenCalledWith("caches")
      })
    })
  })

  describe("With scan data", () => {
    const propsWithData = {
      ...defaultProps,
      scanData: {
        items: mockScanResult.items,
        totalSize: mockScanResult.total_size,
      },
    }

    it("displays items list", () => {
      render(<CategoryView {...propsWithData} />)
      // Use getAllByText since item names appear in both the category header badge and item list
      expect(screen.getAllByText("npm").length).toBeGreaterThan(0)
      expect(screen.getAllByText("yarn").length).toBeGreaterThan(0)
    })

    it("displays total size", () => {
      render(<CategoryView {...propsWithData} />)
      // 3MB formatted
      expect(screen.getByText("3 MB")).toBeInTheDocument()
    })

    it("displays item count", () => {
      render(<CategoryView {...propsWithData} />)
      expect(screen.getByText("2 items found")).toBeInTheDocument()
    })

    it("shows select all button", () => {
      render(<CategoryView {...propsWithData} />)
      expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
    })

    it("shows rescan button", () => {
      render(<CategoryView {...propsWithData} />)
      expect(screen.getByRole("button", { name: /rescan/i })).toBeInTheDocument()
    })

    it("shows delete button disabled when nothing selected", () => {
      render(<CategoryView {...propsWithData} />)
      const deleteButton = screen.getByRole("button", { name: /delete selected/i })
      expect(deleteButton).toBeDisabled()
    })
  })

  describe("Selection behavior", () => {
    const propsWithData = {
      ...defaultProps,
      scanData: {
        items: mockScanResult.items,
        totalSize: mockScanResult.total_size,
      },
    }

    it("updates selected count when clicking select all", async () => {
      render(<CategoryView {...propsWithData} />)

      const selectAllButton = screen.getByRole("button", { name: /select all/i })
      fireEvent.click(selectAllButton)

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument()
      })
    })

    it("toggles between select all and deselect all", async () => {
      render(<CategoryView {...propsWithData} />)

      const selectAllButton = screen.getByRole("button", { name: /select all/i })
      fireEvent.click(selectAllButton)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /deselect all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /deselect all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })
    })
  })

  describe("Delete behavior", () => {
    const propsWithData = {
      ...defaultProps,
      scanData: {
        items: mockScanResult.items,
        totalSize: mockScanResult.total_size,
      },
    }

    it("enables delete button when items are selected", async () => {
      render(<CategoryView {...propsWithData} />)

      // Select all items
      const selectAllButton = screen.getByRole("button", { name: /select all/i })
      fireEvent.click(selectAllButton)

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: /delete/i })
        expect(deleteButton).not.toBeDisabled()
      })
    })

    it("shows selected size in delete button", async () => {
      render(<CategoryView {...propsWithData} />)

      // Select all items
      const selectAllButton = screen.getByRole("button", { name: /select all/i })
      fireEvent.click(selectAllButton)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete \(3 MB\)/i })).toBeInTheDocument()
      })
    })

    it("calls deleteItems when delete button clicked", async () => {
      render(<CategoryView {...propsWithData} />)

      // Select all items
      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete \(3 MB\)/i })).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete \(3 MB\)/i }))

      await waitFor(() => {
        expect(mockDeleteItems).toHaveBeenCalledWith(["/path/to/cache1", "/path/to/cache2"])
      })
    })

    it("rescans after successful delete", async () => {
      render(<CategoryView {...propsWithData} />)

      // Select all items
      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete \(3 MB\)/i })).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete \(3 MB\)/i }))

      // After delete, should rescan
      await waitFor(() => {
        expect(mockOnScanningChange).toHaveBeenCalledWith("caches", true)
        expect(mockScanCategory).toHaveBeenCalledWith("caches")
      })
    })
  })

  describe("Error handling", () => {
    it("displays error banner when scan fails", async () => {
      mockScanCategory.mockRejectedValue(new Error("Scan failed"))

      render(<CategoryView {...defaultProps} />)

      fireEvent.click(screen.getByRole("button", { name: /scan caches/i }))

      await waitFor(() => {
        expect(screen.getByText("Scan failed")).toBeInTheDocument()
      })
    })

    it("displays error banner when delete fails", async () => {
      mockDeleteItems.mockRejectedValue(new Error("Delete failed"))

      const propsWithData = {
        ...defaultProps,
        scanData: {
          items: mockScanResult.items,
          totalSize: mockScanResult.total_size,
        },
      }

      render(<CategoryView {...propsWithData} />)

      // Select all and delete
      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete \(3 MB\)/i })).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete \(3 MB\)/i }))

      await waitFor(() => {
        expect(screen.getByText("Delete failed")).toBeInTheDocument()
      })
    })
  })

  describe("Stats reporting", () => {
    it("reports stats when items exist", async () => {
      const propsWithData = {
        ...defaultProps,
        scanData: {
          items: mockScanResult.items,
          totalSize: mockScanResult.total_size,
        },
      }

      render(<CategoryView {...propsWithData} />)

      await waitFor(() => {
        expect(mockOnStatsUpdate).toHaveBeenCalledWith("caches", {
          itemCount: 2,
          totalSize: 3000000,
        })
      })
    })
  })

  describe("Category reset on change", () => {
    it("clears selection when category changes", async () => {
      const propsWithData = {
        ...defaultProps,
        scanData: {
          items: mockScanResult.items,
          totalSize: mockScanResult.total_size,
        },
      }

      const { rerender } = render(<CategoryView {...propsWithData} />)

      // Select all
      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument()
      })

      // Change category
      rerender(<CategoryView {...propsWithData} category="dev-artifacts" scanData={null} />)

      // Selection should be cleared
      expect(screen.queryByText("2 selected")).not.toBeInTheDocument()
    })
  })
})
