import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyRuntimePair } from "../app-probe/probe-common.mjs";
import { supervisorArtifacts, verifySupervisorSource, verifySupervisorBytes } from "../../../supervisor/supervisor-common.mjs";
import { buildInputs } from "./binder-common.mjs";
import { loadThirteenPatchJscCandidate, verifyThirteenPatchJscCandidate } from "../../webkit-x86_64-16k/thirteen-patch-common.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../..");
const args = process.argv.slice(2);
assert([6, 8].includes(args.length), "Expected input, repeat and output directories, optionally a locked JSC candidate");
const options = Object.fromEntries(Array.from({ length: args.length / 2 }, (_, i) => [args[i * 2], args[i * 2 + 1]]));
const jsc = options["--jsc-candidate-file"] ? loadThirteenPatchJscCandidate() : null;
assert.deepEqual(Object.keys(options).sort(), ["--input-directory", "--output-directory", "--repeat-directory", ...(jsc ? ["--jsc-candidate-file"] : [])].sort());
const inputs = realpathSync(options["--input-directory"]), repeat = realpathSync(options["--repeat-directory"]);
const output = resolve(options["--output-directory"]);
assert.equal(output, resolve(root, `build/experimental-binder${jsc ? "-jsc16k" : ""}/generated/runtime`), "Only the dedicated Gradle output is writable");
const evidence = JSON.parse(readFileSync(resolve(here, "../runtime-evidence.json"), "utf8"));
assert.equal(evidence.identity.distributionReady, false);
verifySupervisorSource();
if (jsc) {
    assert.equal(jsc.bunCommit, evidence.source.downstreamHeadCommit, "The JSC candidate needs a separately verified rebase to the current Bun source");
    verifyThirteenPatchJscCandidate(options["--jsc-candidate-file"], jsc);
    evidence.identity.variant = jsc.variant;
}
const assetOutput = resolve(output, "../binder-assets");
mkdirSync(assetOutput, { recursive: true });
writeFileSync(join(assetOutput, "binder-build.json"), JSON.stringify({ schemaVersion: 1,
    inputEncoding: "git-canonical-utf8-lf", inputs: buildInputs(), runtime: evidence.identity,
    source: evidence.source, jscCandidate: jsc,
    runtimes: evidence.artifacts.map(a => jsc && a.abi === "x86_64" ? jsc.artifact : a).map(({ abi, bytes, sha256 }) => ({ abi, bytes, sha256 })) }, null, 2) + "\n");
for (const artifact of evidence.artifacts) {
    if (jsc && artifact.abi !== "x86_64") continue;
    const runtime = verifyRuntimePair(join(inputs, artifact.filename), join(repeat, artifact.filename), artifact);
    const helper = supervisorArtifacts.get(artifact.abi);
    const helperPath = resolve(root, helper.binaryPath);
    verifySupervisorBytes(readFileSync(helperPath), helper);
    const destination = join(output, artifact.abi);
    mkdirSync(destination, { recursive: true });
    copyFileSync(jsc ? options["--jsc-candidate-file"] : runtime, join(destination, "libbun_exec.so"));
    copyFileSync(helperPath, join(destination, "libbun_supervisor.so"));
    console.log(`Verified experimental ${artifact.abi}: ${jsc ? jsc.artifact.sha256 : artifact.sha256}`);
}
