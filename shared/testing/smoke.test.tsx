// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { axeViolations, describeViolations } from "./axe";
import { mount, type Mounted } from "./render";

let mounted: Mounted | null = null;
afterEach(async () => {
  await mounted?.unmount();
  mounted = null;
});

describe("a11y harness", () => {
  it("passes clean markup and flags a real problem", async () => {
    mounted = await mount(
      <main>
        <h1>Title</h1>
        <button type="button">Save</button>
      </main>,
    );
    expect(describeViolations(await axeViolations(mounted.container))).toEqual([]);
    await mounted.rerender(
      <main>
        <h1>Title</h1>
        <button type="button" />
        <img src="x.png" />
      </main>,
    );
    const ids = (await axeViolations(mounted.container)).map((v) => v.id);
    expect(ids).toEqual(expect.arrayContaining(["button-name", "image-alt"]));
  });
});
