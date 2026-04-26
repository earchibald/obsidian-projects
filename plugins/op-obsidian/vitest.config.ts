import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "md-as-text",
      enforce: "pre",
      transform(_code, id) {
        if (!id.endsWith(".md")) return null;
        const raw = readFileSync(id, "utf8");
        return {
          code: `export default ${JSON.stringify(raw)};`,
          map: null,
        };
      },
    },
  ],
});
