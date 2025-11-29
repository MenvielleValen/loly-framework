#!/usr/bin/env node

// Small bootstrap that delegates to the compiled CLI entrypoint.
// This file is what npm exposes as the "loly" executable.

require("../dist/cli.cjs");
