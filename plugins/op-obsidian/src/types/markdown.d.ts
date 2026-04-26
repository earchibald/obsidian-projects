// Declare all *.md imports as default-export strings.
// esbuild's `loader: { ".md": "text" }` and the vitest "md-as-text" transform
// both serialise the file content the same way (JSON.stringify). Only
// explicitly-imported .md files are bundled — no wildcard scanning occurs.
// The README.md under src/iterm/proto/ is NOT imported anywhere; it is purely
// a documentation file and will never be included in the artifact.
declare module "*.md" {
  const content: string;
  export default content;
}
