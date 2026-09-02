"bun";

// The plugin declares Internet access, so trusted scripts can use Bun's fetch.
// A short local timeout keeps this example below the plugin's 60-second default.
const endpoint = process.env.SAMPLE_FETCH_URL ?? "https://example.com/";
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);

try {
  const response = await fetch(endpoint, { signal: controller.signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  console.log(`GET ${endpoint} -> ${response.status}`);
  console.log(`Received ${body.length} characters`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Request failed: ${message}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
