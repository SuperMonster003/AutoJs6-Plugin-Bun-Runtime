import { createHostClient, type HostClient, type ScreenInfo, type RuntimeAxios, type RuntimeShell, type RuntimeUi, type RuntimeFloaty, type RuntimeWeb,
  type RuntimeTerminal, type RuntimeConsole, type RuntimeCompose } from "../../app/src/main/assets/autojs6/host-client.mjs";

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
if(movie) { const audio:boolean=movie.audio; const bytes:number=movie.size; const source: import('../../app/src/main/assets/autojs6/host-client.mjs').ScreenRecordingAudioSource=movie.audioSource; void [audio,bytes,source]; }
const cancelled:boolean=await host.screenRecorder.cancel();void cancelled;
await host.screenRecorder.start("audio.mp4", {audio:"microphone"});
await host.screenRecorder.start("audio.mp4", {audio:"playback"});
await host.screenRecorder.start("audio.mp4", {audio:"mixed"});
await host.screenRecorder.start("silent.mp4", {audio:false});
// @ts-expect-error select an explicit source rather than an ambiguous true
await host.screenRecorder.start("capture.mp4", {audio:true});
void [pixels, bytes];
void [compact, readings, info, width, traditional];
const isList: boolean = host.util.isArray([1]) && host.species.isObject({}) && host.global.isInteger(1);
const speciesName: string = host.species("text");
const sum: number = host.jsox.mathx.sum(1, 2) + host.global.randomInt(1, 6);
const kibibytes: number = host.cvt.bytes(1024, "KB");
const readable: string = host.fmt.bytes(2048);
const dpPixels: number = host.util.dpToPx(8) + host.util.version.sdkInt;
const ints = await host.util.java.array("int", 2);
const pinyinStyle: 1 = host.pinyin.STYLE_TONE;
host.jsox.extend("Mathx");
const axiosResponse: RuntimeAxios.Response<{ ok: boolean }> = await host.global.axios.get<{ ok: boolean }>("http://127.0.0.1/", { timeout: 1000, params: { q: 1 } });
const axiosOk: boolean = axiosResponse.data.ok && host.global.axios.isAxiosError(null) === false;
const axiosInstance = host.global.axios.create({ baseURL: "http://127.0.0.1/" });
await axiosInstance.post("/items", { name: "x" }, { headers: { "X-Custom": "1" } });
void [axiosOk, host.global.axios.VERSION.length];
// @ts-expect-error axios configurations are objects
await host.global.axios.get("http://127.0.0.1/", "config");
// Rhino app / shell / shizuku members (api-coverage P4.1a).
const killed: boolean = await host.app.kill("com.example") && await host.app.launchDual("com.example") && await host.app.isDualInstalled("com.example");
const apk = await host.app.getApkInfo("/sdcard/example.apk");
const command: RuntimeShell.ShellCommandResult = await host.shell.execCommand("id", true);
const foreground: string = await host.shell.currentPackage() + await host.shizuku.currentComponent() + host.shell.getCommand("ls", { l: true });
await host.shell.Home(); await host.shell.Tap(1, 2); host.shell.SetScreenMetrics(1080, 2400);
const shizukuState = await host.shizuku.state;
const spawned = host.shell.spawn("cat"); const alive: boolean = spawned.isAlive(); const label: string = spawned.toString();
void [killed, apk, command.code, foreground, shizukuState.isOperational, alive, label, spawned.getInputStream(), spawned.listenerCount("exit")];
// @ts-expect-error KeyCode takes a number or a string
await host.shell.KeyCode(true);

// Files and data family of Rhino (api-coverage P4.2b): colors / Color, zip, mime, the timing recorder and the global libraries.
const hex: string = host.colors.toHex(host.colors.rgb(255, 128, 0));
const color = host.global.Color("#ff8000");
const mediaType: string | null = host.mime.getType("text/plain");
host.recorder("p4.2b");
const size: string = host.files.getHumanReadableSize(1024);
const zipped = await host.zip.open("/sdcard/a.zip");
const day: string = host.global.dayjs("2020-01-02").format("YYYY-MM-DD");
// api-coverage P4.1c: Rhino's synchronous Build fields with device.info.
const deviceBrand: string | undefined = host.device.brand;
const deviceSdkInt: number | undefined = host.device.sdkInt;
// @ts-expect-error the Build fields are read-only
host.device.buildId = "x";
// The rest of the startup snapshot (Q154 (a)), the Promise getters and the hardware identifiers (Q153 (a)).
const pageSize: number | undefined = host.device.pageSize;
const marketName: string | undefined = host.device.getMarketName?.();
const miui: boolean | undefined = host.device.roms.isMiui?.();
const backgroundStart: Promise<boolean> = host.device.roms.isBackgroundStartGranted();
const rotation: Promise<number> = host.device.rotation;
const imei: Promise<string | null> = host.device.getIMEI();
await host.device.keepAwake(1, 1000);
// Rhino's sensors (Q147 (a)) and media (Q149 (a) / Q152 (a)).
const light = host.sensors.register("light", host.sensors.delay.ui);
light?.on("change", (event: unknown, value: number) => void value);
light?.unregister();
const session = await host.media.playMusic("/sdcard/a.mp3", 0.5, true);
const sessionStatus = await session.status();
const scanned: boolean = await host.media.scanFile("/sdcard/a.mp3");
const position: number = await host.media.getMusicCurrentPosition();
// Rhino's console output (AutoJs6 api-coverage P4.3, D-10): synchronous, with Rhino's global names next to the controls.
host.console.log("%s", 1);
host.console.err(new Error("e"));
host.console.trace("t", "warn");
const asserted: typeof host.console = host.console.assert(() => true, "message");
host.console.timeEnd(null);
await host.console.openConsole(true);
// @ts-expect-error console.log returns nothing to await on
const logged: Promise<void> = host.console.log("x");
// Rhino's toast family (AutoJs6 api-coverage P4.3): Rhino's argument forms, dismissAll and the globals on host.global.
const shown: { shown: boolean } = await host.toast("t", "long", true);
await host.toast(1, false, "f");
const dismissed: void = await host.toast.dismissAll();
await host.global.toastLog();
await host.global.toastwarn("w", "s");
const uiThread: false = host.global.isUiThread();
// @ts-expect-error toastInfo takes the text
host.global.toastInfo();
// Rhino's automation family (AutoJs6 api-coverage P4.4): automator / auto over the accessibility grants, local threads /
// continuation / timers, recognition modules and the family's globals on host.global.
const clicked: boolean = await host.automator.click(1, 2);
await host.automator.swipe([0, 0], [10, 10], 300);
await host.auto.waitFor(5000);
const running: boolean = (await host.auto.state).isRunning;
const counter: number = host.threads.atomic(1).incrementAndGet();
const resumed: false = host.continuation.enabled;
clearTimeout(host.timers.keepAlive(100));
const text: string = await host.ocr.mlkit.recognizeText({ id: "img" });
const ocrQuad: readonly number[] | undefined = (await host.ocr.paddle.detect({ id: "img" }, { useOpenCL: true, useSlim: false, cpuThreadNum: 2, detLongSize: 960, scoreThreshold: 0.5, useCls: true, detLimitSideLen: 960, maxSideLen: 1024, boxScoreThresh: 0.5, mergeLine: true }))[0]?.extras.quad;
const codes: readonly string[] = await host.qrcode.recognizeTexts("/sdcard/qr.png");
const detector = await host.yolo.load("/sdcard/model", { component: "p/c" });
await detector.close();
await host.global.press(1, 2, 50);
await host.global.sleep(10, 20);
// @ts-expect-error threads.atomic takes a number or a shared buffer
host.threads.atomic("1");
// Rhino's other console window controls (AutoJs6 api-coverage P4.3).
const consoleShowing: boolean = await host.console.isShowing();
await host.console.setGravity(17);
await host.console.configure({ title: "t", size: [400, 600] });
const line: string = await host.console.rawInput("name?");
const evaluated: unknown = await host.console.input();
// Rhino's UI family (AutoJs6 api-coverage P4.3): the content view members of ui, floaty, web, terminal, console.build and the
// web globals with ComposeError on host.global.
await host.ui.layout("<frame><text id='t'/></frame>");
const rootView: RuntimeUi.NativeViewHandle | null = host.ui.root;
const barHeight: number = await host.ui.getStatusBarHeight({ withDimen: false });
const floatyWindow: RuntimeFloaty.FloatyWindow = await host.floaty.window("<frame/>");
await floatyWindow.setPosition(1, 2);
const raw: RuntimeFloaty.RawWindow = await host.floaty.rawWindow("<frame/>");
await raw.setTouchable(false);
const socket: RuntimeWeb.WebSocket = host.web.newWebSocket("wss://example.com", { headers: { a: "b" } });
socket.send(host.web.ByteString.encodeUtf8("hi"));
const terminalSession: RuntimeTerminal.TerminalSession = await host.terminal.open({ cwd: "/sdcard" });
const matched: string = await terminalSession.waitFor(/ready/, 1000);
const configurator: RuntimeConsole.ConsoleConfigurator = host.console.build({ title: "t" }).setSize(1, 2);
await configurator.show();
const composeError: RuntimeCompose.ComposeError = new host.global.ComposeError("bad", "INVALID_ARGUMENT");
// @ts-expect-error floaty.window takes a layout
host.floaty.window();
