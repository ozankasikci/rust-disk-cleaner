import { describe, it, expect } from "vitest"
import { formatBytes, formatDate } from "./format"

describe("formatBytes", () => {
  it("returns '0 B' for zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B")
  })

  it("formats bytes correctly", () => {
    expect(formatBytes(500)).toBe("500 B")
    expect(formatBytes(999)).toBe("999 B")
  })

  it("formats kilobytes correctly", () => {
    expect(formatBytes(1000)).toBe("1 KB")
    expect(formatBytes(1500)).toBe("1.5 KB")
    expect(formatBytes(999000)).toBe("999 KB")
  })

  it("formats megabytes correctly", () => {
    expect(formatBytes(1000000)).toBe("1 MB")
    expect(formatBytes(1500000)).toBe("1.5 MB")
    expect(formatBytes(500000000)).toBe("500 MB")
  })

  it("formats gigabytes correctly", () => {
    expect(formatBytes(1000000000)).toBe("1 GB")
    expect(formatBytes(1500000000)).toBe("1.5 GB")
    expect(formatBytes(10000000000)).toBe("10 GB")
  })

  it("formats terabytes correctly", () => {
    expect(formatBytes(1000000000000)).toBe("1 TB")
    expect(formatBytes(2500000000000)).toBe("2.5 TB")
  })

  it("handles edge cases", () => {
    expect(formatBytes(1)).toBe("1 B")
    // 999,999 bytes = 1000 KB (rounds up due to decimal precision)
    expect(formatBytes(999999)).toBe("1000 KB")
  })
})

describe("formatDate", () => {
  it("formats ISO date string correctly", () => {
    const isoDate = "2024-01-15T14:30:00.000Z"
    const formatted = formatDate(isoDate)

    // Should contain the year
    expect(formatted).toContain("2024")
    // Should contain the month (Jan)
    expect(formatted).toMatch(/Jan/)
    // Should contain the day
    expect(formatted).toContain("15")
  })

  it("handles different date formats", () => {
    const date1 = "2023-12-25T00:00:00.000Z"
    const formatted1 = formatDate(date1)
    expect(formatted1).toContain("2023")
    expect(formatted1).toMatch(/Dec/)

    const date2 = "2024-06-01T12:00:00.000Z"
    const formatted2 = formatDate(date2)
    expect(formatted2).toContain("2024")
    expect(formatted2).toMatch(/Jun/)
  })

  it("includes time information", () => {
    const isoDate = "2024-01-15T14:30:00.000Z"
    const formatted = formatDate(isoDate)

    // Should include time (format may vary by locale but should have numbers)
    expect(formatted).toMatch(/\d+:\d+/)
  })
})
