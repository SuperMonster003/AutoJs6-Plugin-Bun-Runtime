"bun";

// Requires a current host, Bun Runtime, and an enabled 3-Hanzi CC plugin for conversion.
const sdk = process.env.AUTOJS6_HOST_CLIENT_MODULE;
if (!sdk) throw new Error("Enable the Bun host capability bridge in AutoJs6 Plugin Center");
const { createHostClient } = await import(sdk);
const host = await createHostClient();
if (host.hasCapability("text.opencc")) console.log(await host.opencc.s2t("简体中文转换测试"));

// A 3x2 RGBA PNG: red, half-alpha green, transparent black / blue, white, black.
const png = "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAFklEQVR4nGP4z8DwHwgbGCDgPxiAGAB5qQp3ze/uggAAAABJRU5ErkJggg==";
const images = host.images;
const owned = [];
const keep = image => { owned.push(image); return image; };
try {
  const source = keep(await images.fromBase64(png));
  const pixels = await images.readPixels(source);
  const expected = [-65536, -2147418368, 0, -16776961, -1, -16777216];
  if (JSON.stringify(pixels.data) !== JSON.stringify(expected)) throw new Error("Unexpected signed ARGB32 pixels");
  console.log("pixels", pixels);
  console.log("half-alpha green", await images.pixel(source, 1, 0));
  console.log("red matches", await images.findAllPointsForColor(source, -65536, { threshold: 0 }));
  const copy = keep(await images.copy(source));
  const rotated = keep(await images.rotate(copy, 90, { filter: false }));
  const flipped = keep(await images.flip(source, "horizontal"));
  const clipped = keep(await images.clip(source, 0, 0, 2, 2));
  console.log("derived dimensions", [rotated, flipped, clipped].map(images.getSize));
  const encoded = await images.toBytes(source, "png");
  const decoded = keep(await images.fromBytes(encoded));
  if (JSON.stringify((await images.readPixels(decoded)).data) !== JSON.stringify(expected)) throw new Error("PNG alpha round trip changed pixels");
  if (host.hasCapability("image.files")) {
    // The path belongs to the host's working directory, not Bun's private snapshot.
    await images.saveImage(source, "bun-image-pattern.png");
    const fromFile = keep(await images.readImage("bun-image-pattern.png"));
    console.log("host file image", images.getSize(fromFile));
  }
} finally {
  // Sequential release avoids exceeding the bridge's four concurrent calls.
  for (const image of owned.reverse()) await images.recycle(image);
}
