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

test("a source lock cannot relax the same-Release source-asset requirement", () => {
  const lock = JSON.parse(readFileSync(resolve(experimentRoot, "distribution-source.lock.json"), "utf8"));
  lock.redistributionRequirements.requireSameReleaseSourceAssets = false;
  assert.throws(
    () => verifyDistributionSourceManifest(lock),
    /redistribution requirement requireSameReleaseSourceAssets/,
  );
});

test("automated validation remains a technical statement rather than legal approval", () => {
  const lock = JSON.parse(readFileSync(resolve(experimentRoot, "distribution-source.lock.json"), "utf8"));
  assert.equal(lock.redistributionRequirements.legalReviewRequiredByProjectPolicy, false);
  assert.equal(lock.boundaries.legalApprovalClaimed, false);
  lock.boundaries.legalApprovalClaimed = true;
  assert.throws(() => verifyDistributionSourceManifest(lock), /legal-approval boundary/);
});
