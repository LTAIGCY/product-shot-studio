import { describe, expect, it } from "vitest";
import { updateAnnouncements } from "./updateAnnouncements";

describe("update announcements", () => {
  it("keeps detailed Chinese release entries with explicit update time", () => {
    expect(updateAnnouncements.length).toBeGreaterThan(0);

    for (const announcement of updateAnnouncements) {
      expect(announcement.title.trim().length).toBeGreaterThan(0);
      expect(announcement.summary.trim().length).toBeGreaterThan(20);
      expect(announcement.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(announcement.sections.length).toBeGreaterThan(0);

      for (const section of announcement.sections) {
        expect(section.heading.trim().length).toBeGreaterThan(0);
        expect(section.items.length).toBeGreaterThan(0);
        expect(section.items.every((item) => item.trim().length > 10)).toBe(true);
      }
    }
  });

  it("keeps the latest announcement aligned with the required update record format", () => {
    const latest = updateAnnouncements[0];

    expect(latest.version).toBe("0.3.9");
    expect(latest.publishedAt).toBe("2026-07-01 20:57:55");
    expect(latest.sections.map((section) => section.heading)).toEqual(
      expect.arrayContaining(["个人画布", "无限画布", "设置与验证"])
    );
  });
});
