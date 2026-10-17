import { createHostClient, type HostClient, type ScreenInfo } from "../../app/src/main/assets/autojs6/host-client.mjs";

const host: HostClient = await createHostClient();
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
// @ts-expect-error a coordinate cannot be a string
await host.coordinates.cX("360");
// @ts-expect-error unknown host methods should not autocomplete as callable
await host.pinyin.missing();
void [compact, readings, info, width];
