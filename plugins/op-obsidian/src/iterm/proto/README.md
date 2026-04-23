# Vendored iTerm2 protobuf schema

- Source: https://github.com/gnachman/iTerm2/blob/master/proto/api.proto (MIT)
- Pinned commit: `9be6cc9e95a2933f83bc1935fb345d0c456c373c` (2026-04-22)
- Generated with protobufjs-cli: `pbjs -t static-module -w commonjs -o api.generated.js api.proto && pbts -o api.generated.d.ts api.generated.js`

Regenerate only when the upstream schema adds a feature we need. protobuf2 is
backward-compatible at the wire level, so bumping the pin is safe as long as we
only read/write fields that existed in the pinned snapshot.
