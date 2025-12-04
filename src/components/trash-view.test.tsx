import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TrashView } from "./trash-view"
import * as tauriLib from "@/lib/tauri"

// Mock tauri functions
vi.mock("@/lib/tauri", () => ({
  listTrash: vi.fn(),
  restoreItems: vi.fn(),
  purgeTrash: vi.fn(),
  permanentlyDelete: vi.fn(),
  permanentlyDeleteItems: vi.fn(),
}))

const mockListTrash = vi.mocked(tauriLib.listTrash)
const mockRestoreItems = vi.mocked(tauriLib.restoreItems)
const mockPurgeTrash = vi.mocked(tauriLib.purgeTrash)
const mockPermanentlyDelete = vi.mocked(tauriLib.permanentlyDelete)
const mockPermanentlyDeleteItems = vi.mocked(tauriLib.permanentlyDeleteItems)

describe("TrashView", () => {
  const mockOnStatsUpdate = vi.fn()

  const mockTrashItems = [
    {
      id: "1",
      name: "test-file-1.txt",
      original_path: "/Users/test/Desktop/test-file-1.txt",
      trash_path: "/Users/test/.diskclean-trash/test-file-1.txt",
      size: 1000,
      deleted_at: "2024-01-01T12:00:00Z",
    },
    {
      id: "2",
      name: "test-folder",
      original_path: "/Users/test/Projects/test-folder",
      trash_path: "/Users/test/.diskclean-trash/test-folder",
      size: 5000000,
      deleted_at: "2024-01-02T14:30:00Z",
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockListTrash.mockResolvedValue([])
    mockRestoreItems.mockResolvedValue(1)
    mockPurgeTrash.mockResolvedValue(2)
    mockPermanentlyDelete.mockResolvedValue(undefined)
    mockPermanentlyDeleteItems.mockResolvedValue(2)
  })

  describe("Loading state", () => {
    it("shows loading spinner initially", () => {
      mockListTrash.mockImplementation(() => new Promise(() => {})) // Never resolves
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      // Should show loading state
      expect(screen.getByText("Trash")).toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("shows empty message when trash is empty", async () => {
      mockListTrash.mockResolvedValue([])
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByText("Trash is empty")).toBeInTheDocument()
      })
    })

    it("does not show any action buttons when empty", async () => {
      mockListTrash.mockResolvedValue([])
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByText("Trash is empty")).toBeInTheDocument()
      })

      expect(screen.queryByRole("button", { name: /select all/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /empty trash/i })).not.toBeInTheDocument()
    })
  })

  describe("With items", () => {
    beforeEach(() => {
      mockListTrash.mockResolvedValue(mockTrashItems)
    })

    it("displays trash items", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByText("test-file-1.txt")).toBeInTheDocument()
        expect(screen.getByText("test-folder")).toBeInTheDocument()
      })
    })

    it("displays original paths", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByText("/Users/test/Desktop/test-file-1.txt")).toBeInTheDocument()
        expect(screen.getByText("/Users/test/Projects/test-folder")).toBeInTheDocument()
      })
    })

    it("displays item count and total size in header", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        // 5001000 bytes = ~5 MB
        expect(screen.getByText(/2 items/)).toBeInTheDocument()
      })
    })

    it("shows select all button", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })
    })

    it("shows empty trash button", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /empty trash/i })).toBeInTheDocument()
      })
    })

    it("shows restore selected button (disabled when nothing selected)", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        const restoreButton = screen.getByRole("button", { name: /restore selected/i })
        expect(restoreButton).toBeInTheDocument()
        expect(restoreButton).toBeDisabled()
      })
    })

    it("shows delete selected button (disabled when nothing selected)", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: /delete selected/i })
        expect(deleteButton).toBeInTheDocument()
        expect(deleteButton).toBeDisabled()
      })
    })
  })

  describe("Selection behavior", () => {
    beforeEach(() => {
      mockListTrash.mockResolvedValue(mockTrashItems)
    })

    it("selects all items when clicking select all", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument()
      })
    })

    it("toggles to deselect all after selecting all", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /deselect all/i })).toBeInTheDocument()
      })
    })

    it("enables restore button when items are selected", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        const restoreButton = screen.getByRole("button", { name: /restore selected/i })
        expect(restoreButton).not.toBeDisabled()
      })
    })

    it("enables delete selected button when items are selected", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: /delete selected/i })
        expect(deleteButton).not.toBeDisabled()
      })
    })
  })

  describe("Restore behavior", () => {
    beforeEach(() => {
      mockListTrash.mockResolvedValue(mockTrashItems)
    })

    it("calls restoreItems when clicking restore selected", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /restore selected/i })).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole("button", { name: /restore selected/i }))

      await waitFor(() => {
        expect(mockRestoreItems).toHaveBeenCalledWith(["1", "2"])
      })
    })

    it("clears selection after restore", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /restore selected/i }))

      await waitFor(() => {
        expect(screen.getByText("0 selected")).toBeInTheDocument()
      })
    })
  })

  describe("Delete selected behavior", () => {
    beforeEach(() => {
      mockListTrash.mockResolvedValue(mockTrashItems)
    })

    it("calls permanentlyDeleteItems when clicking delete selected", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete selected/i })).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }))

      await waitFor(() => {
        expect(mockPermanentlyDeleteItems).toHaveBeenCalledWith(["1", "2"])
      })
    })

    it("clears selection after delete", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }))

      await waitFor(() => {
        expect(screen.getByText("0 selected")).toBeInTheDocument()
      })
    })

    it("reloads list after delete", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      // Clear previous calls from initial load
      mockListTrash.mockClear()

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete selected/i })).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }))

      await waitFor(() => {
        expect(mockListTrash).toHaveBeenCalled()
      })
    })
  })

  describe("Empty trash (purge) behavior", () => {
    beforeEach(() => {
      mockListTrash.mockResolvedValue(mockTrashItems)
    })

    it("shows confirmation dialog when clicking empty trash", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /empty trash/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /empty trash/i }))

      await waitFor(() => {
        expect(screen.getByText("Empty Trash?")).toBeInTheDocument()
        expect(screen.getByText(/this will permanently delete/i)).toBeInTheDocument()
      })
    })

    it("calls purgeTrash when confirming empty trash", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /empty trash/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /empty trash/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete permanently/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }))

      await waitFor(() => {
        expect(mockPurgeTrash).toHaveBeenCalled()
      })
    })

    it("does not call purgeTrash when canceling", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /empty trash/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /empty trash/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }))

      await waitFor(() => {
        expect(mockPurgeTrash).not.toHaveBeenCalled()
      })
    })
  })

  describe("Single item actions", () => {
    beforeEach(() => {
      mockListTrash.mockResolvedValue(mockTrashItems)
    })

    it("has restore button for each item", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        // Each item should have a restore button (with title)
        const restoreButtons = screen.getAllByTitle("Restore")
        expect(restoreButtons.length).toBe(2)
      })
    })

    it("has delete button for each item", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        // Each item should have a delete button (with title)
        const deleteButtons = screen.getAllByTitle("Delete permanently")
        expect(deleteButtons.length).toBe(2)
      })
    })

    it("restores single item when clicking row restore button", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getAllByTitle("Restore").length).toBe(2)
      })

      // Click first restore button
      fireEvent.click(screen.getAllByTitle("Restore")[0])

      await waitFor(() => {
        expect(mockRestoreItems).toHaveBeenCalledWith(["1"])
      })
    })

    it("deletes single item when clicking row delete button", async () => {
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getAllByTitle("Delete permanently").length).toBe(2)
      })

      // Click first delete button
      fireEvent.click(screen.getAllByTitle("Delete permanently")[0])

      await waitFor(() => {
        expect(mockPermanentlyDelete).toHaveBeenCalledWith("1")
      })
    })
  })

  describe("Stats reporting", () => {
    it("reports stats when items exist", async () => {
      mockListTrash.mockResolvedValue(mockTrashItems)
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(mockOnStatsUpdate).toHaveBeenCalledWith({
          itemCount: 2,
          totalSize: 5001000,
        })
      })
    })

    it("reports null stats when trash is empty", async () => {
      mockListTrash.mockResolvedValue([])
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(mockOnStatsUpdate).toHaveBeenCalledWith(null)
      })
    })
  })

  describe("Error handling", () => {
    it("displays error message when listing fails", async () => {
      mockListTrash.mockRejectedValue(new Error("Failed to list trash"))
      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByText("Failed to list trash")).toBeInTheDocument()
      })
    })

    it("displays error message when restore fails", async () => {
      mockListTrash.mockResolvedValue(mockTrashItems)
      mockRestoreItems.mockRejectedValue(new Error("Restore failed"))

      render(<TrashView onStatsUpdate={mockOnStatsUpdate} />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: /select all/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /restore selected/i })).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole("button", { name: /restore selected/i }))

      await waitFor(() => {
        expect(screen.getByText("Restore failed")).toBeInTheDocument()
      })
    })
  })
})
