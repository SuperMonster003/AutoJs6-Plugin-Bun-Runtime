"bun";

// The first line tells AutoJs6 to route this one-file snapshot to Bun.
// Bun.version and process.platform also make it easy to confirm the engine.
console.log(`Hello from Bun ${Bun.version} on ${process.platform}`);
