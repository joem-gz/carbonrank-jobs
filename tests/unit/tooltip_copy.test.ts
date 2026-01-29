import { describe, expect, it } from "vitest";
import { TOOLTIP_COPY } from "../../src/ui/copy/tooltips";

describe("tooltip copy", () => {
  it("defines short descriptions for each tooltip", () => {
    expect(TOOLTIP_COPY.sic.description).toContain("SIC");
    expect(TOOLTIP_COPY.sbti.description).toContain("SBTi");
    expect(TOOLTIP_COPY.sectorBaseline.description).toContain("Sector");
  });
});
