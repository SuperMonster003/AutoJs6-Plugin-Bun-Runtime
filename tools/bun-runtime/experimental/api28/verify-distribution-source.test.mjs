import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  verifyDistributionSource,
  verifyDistributionSourceManifest,
} from "./verify-distribution-source.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));

test("the checked-in corresponding-source and packaged-license closure is consistent", () => {
  const result = verifyDistributionSource();
  assert.equal(result.artifactCount, 2);
  assert.equal(result.packagedLicenseCount, 5);
  assert.equal(result.nativeSourceArchiveCount, 19);
  assert.equal(result.cargoArchiveCount, 206);
  assert.equal(result.bunRegistryArchiveCount, 125);
  assert.equal(result.bunSourceVerified, false);
  assert.equal(result.webkitSourceVerified, false);
  assert.equal(result.distributionReady, false);
});

test("a source lock cannot relax a redistribution requirement", () => {
  const lock = JSON.parse(readFileSync(resolve(experimentRoot, "distribution-source.lock.json"), "utf8"));
  lock.redistributionRequirements.provideExactWebKitSource = false;
  assert.throws(
    () => verifyDistributionSourceManifest(lock),
    /redistribution requirement provideExactWebKitSource/,
  );
});
