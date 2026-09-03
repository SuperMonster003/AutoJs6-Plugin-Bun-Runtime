import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { normalizePackageManifest } from "./build-host-image.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));

test("installed package manifests are normalized with byte-order sorting and one final newline", () => {
  assert.equal(normalizePackageManifest("z\t2\r\na\t1\r\n"), "a\t1\nz\t2\n");
  assert.throws(() => normalizePackageManifest("missing-version\n"), /Invalid installed-package manifest line/);
});

test("the host Dockerfile has a digest base, external deb context, and no network package command", () => {
  const dockerfile = readFileSync(resolve(experimentRoot, "host-package.Dockerfile"), "utf8");
  assert.match(dockerfile, /^FROM ubuntu@sha256:[0-9a-f]{64}$/m);
  assert.match(dockerfile, /^COPY --from=host_packages \/ \/host-debs\/$/m);
  assert.doesNotMatch(dockerfile, /^#\s*syntax=/m);
  assert.doesNotMatch(dockerfile, /\b(?:apt|apt-get)\s+(?:update|install)\b/);
});

test("the offline installer validates the expected deferred Pre-Depends and final manifest", () => {
  const installer = readFileSync(resolve(experimentRoot, "install-host-packages.sh"), "utf8");
  assert.match(installer, /dpkg --audit/);
  assert.match(installer, /gawk_/);
  assert.match(installer, /python3-minimal_/);
  assert.match(installer, /actual_manifest_sha256/);
  assert.match(installer, /PYTHONHASHSEED=0/);
  assert.match(installer, /\/var\/cache\/ldconfig\/aux-cache/);
  assert.doesNotMatch(installer, /\b(?:curl|wget|apt-get)\b/);
});

test("the Python bytecode normalizer recompiles only existing caches in sorted order", () => {
  const normalizer = readFileSync(resolve(experimentRoot, "normalize-host-python-bytecode.py"), "utf8");
  assert.match(normalizer, /filename\.endswith\("\.pyc"\)/);
  assert.match(normalizer, /source_from_cache/);
  assert.match(normalizer, /PycInvalidationMode\.CHECKED_HASH/);
  assert.doesNotMatch(normalizer, /compileall/);
});
