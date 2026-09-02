"bun";

// stdout and stderr are streamed to AutoJs6 as separate bounded channels.
// Their relative order is intentionally not assumed because they are drained concurrently.
console.log("stdout: a normal result");
console.error("stderr: a diagnostic message");

await new Promise((resolve) => setTimeout(resolve, 100));
process.stdout.write("stdout: written without console.log\n");
process.stderr.write("stderr: written without console.error\n");
