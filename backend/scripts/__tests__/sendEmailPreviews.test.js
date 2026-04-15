import { describe, expect, it } from "vitest";
import { parsePreviewArgs } from "../sendEmailPreviews.js";

describe("sendEmailPreviews script", () => {
  it("rejects missing recipient", () => {
    expect(() => parsePreviewArgs([])).toThrow(
      "Usage: npm run email:preview -- --to email@example.com"
    );
  });

  it("parses recipient from --to", () => {
    expect(parsePreviewArgs(["--to", "test@example.com"])).toEqual({
      to: "test@example.com",
    });
  });
});
