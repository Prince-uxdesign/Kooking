import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

export interface Mounted {
  container: HTMLElement;
  root: Root;
  rerender: (ui: ReactElement) => Promise<void>;
  unmount: () => Promise<void>;
}

/** Mounts into jsdom's document so focus, key events and effects behave like a browser. */
export async function mount(ui: ReactElement): Promise<Mounted> {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(ui));
  return {
    container,
    root,
    rerender: async (next) => {
      await act(async () => root.render(next));
    },
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export { act };
