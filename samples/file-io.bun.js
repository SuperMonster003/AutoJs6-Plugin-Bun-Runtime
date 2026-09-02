"bun";

// Each run starts in a private workspace owned by the plugin process.
// The complete workspace, including this file, is removed after the run ends.
const path = `${process.cwd()}/sample-profile.json`;
const profile = {
  engine: "bun",
  version: Bun.version,
  savedAt: new Date().toISOString(),
};

await Bun.write(path, JSON.stringify(profile, null, 2));
const restored = await Bun.file(path).json();

console.log(`Saved and restored ${restored.engine} ${restored.version}`);
console.log(`Temporary file: ${path}`);
