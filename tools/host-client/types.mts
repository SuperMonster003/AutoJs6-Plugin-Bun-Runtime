import { createHostClient, type HostClient, type ScreenInfo } from "../../app/src/main/assets/autojs6/host-client.mjs";

const host: HostClient = await createHostClient();
const traditional: string = await host.opencc("汉语", "s2t");
await host.opencc.convert("汉语", "S2TW");
await host.opencc.jp2twi("漢字");
// @ts-expect-error null text is not silently converted into a string
await host.opencc.s2t(null);
// @ts-expect-error unknown conversion types are not advertised as supported
await host.opencc("汉字", "unknown");
const matrix: string[][] = await host.pinyin.convert("北京上海", { style: "TONE" });
const compact: string[][] = await host.pinyin.compact(matrix);
const readings: string[][] = await host.pinyin4j.readings("重庆", { romanization: "HANYU_PINYIN" });
const info: ScreenInfo = await host.coordinates.getInfo();
const width: number = await host.coordinates.cX();
await host.coordinates.cX(360, 720, false);
await host.coordinates.cY(0.5, true);
await host.coordinates.cXy(0.5, "16:9", "auto");
await host.coordinates.cYx(1, null, true);
await host.coordinates.setScaleBases(720, 1280);
await host.console.setTitle("Bun");
await host.console.setContentTextColors("#ffffff", 0xff000000);
await host.console.setContentTextColors([null, "#ffffff"]);
await host.console.setContentTextColors({ warn: "#ff8800", info: null });
await host.console.setTitleBackgroundTint(null);
// @ts-expect-error a standalone null is not a color; null is allowed in lists/maps
await host.console.setContentTextColors(null);
await host.coordinates.cX("360");
await host.coordinates.cY("0.5", true);
await host.coordinates.cXy("0.5", "16:9");
await host.coordinates.cYx("360", 1080, false);
// @ts-expect-error an explicit undefined coordinate is rejected, unlike cX() with zero arguments
await host.coordinates.cX(undefined);
// @ts-expect-error cross-axis coordinates also require a defined first argument
await host.coordinates.cXy(undefined);
// @ts-expect-error unknown host methods should not autocomplete as callable
await host.pinyin.missing();
const image = await host.images.fromBytes(new Uint8Array([137, 80, 78, 71]));
const pixels: readonly number[] = (await host.images.readPixels(image)).data;
const bytes: Uint8Array = await host.images.toBytes(image, { format: "png" });
await host.images.rotate(image, 90, { filter: false });
await host.images.flip(image, false, true);
await host.images.scale(image, 2, { interpolation: "nearest" });
await host.images.gaussianBlur(image, [3, 3], { sigmaX: 1 });
await host.images.detectsColor(image, -65536, 0, 0, 0);
await host.images.recycle(image);
// @ts-expect-error Bun only returns encoded bytes; raw RGBA is a Node-specific transport
await host.images.toBytes(image, "rgba");
const authorized: boolean = await host.images.requestScreenCapture({orientation:"portrait",timeoutMs:60_000});
const captured = await host.images.captureScreen();
await host.images.recycle(captured);
const stopped: boolean = await host.images.stopScreenCapture();
// @ts-expect-error capture reads the authorized display, not an arbitrary source
await host.images.captureScreen("camera");
void [authorized, stopped];
await host.screenRecorder.start("capture.mp4", {width:320,height:180,frameRate:30,bitRate:1000000});
const recording=await host.screenRecorder.getStatus();
if(recording.state!=="idle") { const width:number=recording.width; void width; }
const movie=await host.screenRecorder.stop();
if(movie) { const silent:false=movie.audio; const bytes:number=movie.size; void [silent,bytes]; }
const cancelled:boolean=await host.screenRecorder.cancel();void cancelled;
// @ts-expect-error audio capture has not been implemented
await host.screenRecorder.start("capture.mp4", {audio:true});
void [pixels, bytes];
void [compact, readings, info, width, traditional];
