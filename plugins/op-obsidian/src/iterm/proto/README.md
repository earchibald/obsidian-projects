# Vendored iTerm2 protobuf schema

- Source: https://github.com/gnachman/iTerm2/blob/master/proto/api.proto (MIT)
- Pinned commit: `9be6cc9e95a2933f83bc1935fb345d0c456c373c` (2026-04-22)
- Generated with protobufjs-cli, invoked on-demand via `npx`:

  ```bash
  npx --package=protobufjs-cli@2 -- pbjs -t static-module -w commonjs -o api.generated.js api.proto
  npx --package=protobufjs-cli@2 -- pbts -o api.generated.d.ts api.generated.js
  ```

Regenerate only when the upstream schema adds a feature we need. protobuf2 is
backward-compatible at the wire level, so bumping the pin is safe as long as we
only read/write fields that existed in the pinned snapshot.

`protobufjs-cli` is intentionally **not** in `devDependencies` — it pulls in a
deprecated `glob@8 → inflight@1.0.6` chain that triggers an `npm install`
deprecation warning, and its codegen runs at most a few times a year. The
runtime dep `protobufjs` (used by `api.generated.js` to encode/decode WebSocket
frames) stays in `dependencies`.
