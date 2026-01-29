import { describe, expect, it } from "vitest";
import { renderAll } from "../../widget/src/index";
import { APP_NAME } from "../../src/ui/brand";

function createDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe(`${APP_NAME} widget`, () => {
  it("renders ok payloads from data attribute", () => {
    const doc = createDoc(
      `<!doctype html><body><span data-carbonrank='{"status":"ok","score":123}'></span></body>`,
    );

    renderAll({ doc });

    const badge = doc.querySelector(".carbonrank-widget__badge");
    expect(badge?.textContent).toBe("123 kgCO2e/yr");
    expect(doc.querySelectorAll("[data-carbonrank-rendered='true']")).toHaveLength(1);
  });

  it("renders wfh and no-data states with modal shell", () => {
    const doc = createDoc(
      `<!doctype html><body>
        <span data-carbonrank='{"status":"wfh"}'></span>
        <span data-carbonrank='{"status":"no_data","reason":"Location missing"}'></span>
      </body>`,
    );

    renderAll({ doc });

    const badges = doc.querySelectorAll(".carbonrank-widget__badge");
    expect(badges[0]?.textContent).toBe("0 kgCO2e/yr");
    expect(badges[1]?.textContent).toBe("No data");

    const howButton = doc.querySelector(
      ".carbonrank-widget__how",
    ) as HTMLButtonElement;
    howButton.click();

    const modal = doc.getElementById("carbonrank-widget-modal");
    expect(modal).not.toBeNull();
    expect(modal?.hidden).toBe(false);
  });
});
