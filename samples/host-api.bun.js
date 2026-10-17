"bun";

const path = process.env.AUTOJS6_HOST_CLIENT_MODULE;
if (!path) throw new Error("Update Bun Runtime and enable a host capability in AutoJs6 Plugin Center");
const { createHostClient } = await import(path);
const host = await createHostClient();

console.log("granted capabilities", host.capabilities);
if (host.hasCapability("screen.metrics")) {
  console.log("screen", await host.coordinates.getInfo());
  console.log("center x", await host.coordinates.cX(0.5));
  console.log("center y", await host.coordinates.cY(0.5));
  console.log("cross x/y", await host.coordinates.cXy(0.5, "16:9"), await host.coordinates.cYx(0.5, "16:9"));
}
if (host.hasCapability("text.pinyin")) {
  // A matching Pinyin plugin must also be installed and enabled. Failure is explicit.
  console.log("pinyin", await host.pinyin.simple("北京上海"));
}
if (host.hasCapability("text.pinyin4j")) {
  console.log("readings", await host.pinyin4j.readings("重庆"));
}
if (host.hasCapability("console.control")) {
  await host.console.setTitle("Bun host API");
  await host.console.show();
  console.log("Bun stdout is forwarded into this execution's console");
}
