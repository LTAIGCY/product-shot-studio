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
});
