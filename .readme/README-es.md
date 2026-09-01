<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>Ejecuta JavaScript y TypeScript con el motor Bun independiente en un proceso Android aislado</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### Idiomas

******

El archivo README.md actual admite los siguientes idiomas:

- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-en.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ar.md)
- Español [es] # actual
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-fr.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ru.md)
- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### Introducción

******

Bun Runtime es un plugin Android independiente que permite a AutoJs6 elegir [Bun](https://bun.sh/) como motor separado de JavaScript y TypeScript. El host envía una instantánea del código fuente mediante un descriptor de archivo, el plugin inicia el ejecutable Android oficial y fijado de Bun en su propio proceso de runtime, y la salida estándar, los errores, la finalización, el timeout y la cancelación vuelven mediante Binder. Es una ejecución real de Bun y no un alias de Rhino o Node.js.

******

### Funciones

******

- Motor independiente: ejecuta el binario Android oficial de Bun 1.4.0 en vez de reenviar el código a otro motor de AutoJs6.
- JavaScript y TypeScript: Bun analiza y ejecuta una única instantánea JS o TS, incluida la sintaxis ESM y las API de Bun disponibles en la compilación Android fijada.
- Ejecución observable: stdout y stderr se transmiten al host, y el resultado final informa del estado de salida, la duración, el timeout, la cancelación y diagnósticos limitados.
- Runtime controlado: los binarios de `arm64-v8a` y `x86_64` quedan fijados por tag, commit, tamaño, SHA-256, máquina ELF y alineación PT_LOAD mínima.
- Entrega localizada: los metadatos, las instrucciones del centro de plugins, el README y el changelog cubren 10 idiomas desde un único conjunto validado.

******

### Instalación y uso

******

1. Usa AutoJs6 build 5278 (6.8.0) o posterior en Android 14 (API 34) o posterior.
2. Instala el APK que coincida con el ABI del dispositivo. Elige `arm64-v8a` para la mayoría de teléfonos y tabletas, `x86_64` para un emulador o dispositivo compatible, o `universal` si no estás seguro.
3. Abre el centro de plugins de AutoJs6 y activa Bun Runtime. Si el plugin recién instalado permanece detenido, usa la acción `Activar` que muestra el host.
4. Pon la directiva independiente `"bun";` al principio de un archivo JavaScript o TypeScript y ejecútalo normalmente desde AutoJs6.

> La versión 0.1 ejecuta una instantánea inmutable por solicitud con `bun run --no-install <source>`, por lo que nunca instala dependencias ausentes automáticamente. Lee las limitaciones antes de migrar un proyecto Rhino o Node.js existente a Bun.

******

### Inicio rápido

******

Ejecuta este archivo para confirmar que el host seleccionó Bun y que el runtime Android se inició:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

La salida esperada empieza por `Bun 1.4.0` y después muestra `android`.

Bun procesa TypeScript directamente, por lo que no hace falta compilar TypeScript en el host:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### Compatibilidad

******

- Runtime: Bun oficial 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Plataforma: Android 14 (API 34) o posterior, con binarios oficiales de 64 bits para `arm64-v8a` y `x86_64` baseline. Una prueba real en API 31 falló con `SIGSYS` de app seccomp en la syscall 436 `close_range` de Bun. La lista estándar de apps AOSP Android 13 aún no incluye esa syscall y la añade en API 34. Un dispositivo Sony API 33 pasó de forma inesperada, pero ese resultado específico no demuestra compatibilidad portable. Los recorridos Binder JS y TS en un dispositivo API 35 pasaron. API 28 a 33 siguen fuera del rango admitido hasta disponer de fallback upstream y validación portable.
- Contrato del host: AutoJs6 build 5278 o posterior y contrato Bun runtime versión 1.
- Límites: fuente de hasta 16 MiB, presupuesto combinado de streaming para stdout y stderr de hasta 8 MiB y timeout predeterminado de 60 seconds.
- Paquetes: los APK de un solo ABI reducen el tamaño, mientras el APK `universal` incluye los dos ABI admitidos.

******

### Limitaciones de la versión 0.1

******

- Una sola instantánea: esta versión no implementa la transferencia de proyectos con varios archivos ni las importaciones relativas del proyecto.
- Sin globals de AutoJs6: los globals de Rhino, las API de automatización Android y los objetos del host no aparecen dentro de Bun.
- Sin puente Java: Bun no puede acceder directamente a clases u objetos Java del proceso AutoJs6.
- Sin promesa de toolchain completo: `bunx`, ejecutables producidos en el dispositivo, compilación C en runtime y addons nativos arbitrarios quedan fuera del alcance admitido.
- No es un sandbox de seguridad: un script Bun se ejecuta como código de confianza con el UID del plugin y puede usar los permisos concedidos al plugin.

******

### Permisos e integridad

******

- Los componentes Wake, info y runtime exportados están protegidos por `org.autojs.permission.PLUGIN`; AutoJs6 mantiene sus comprobaciones normales de autorización.
- La instantánea se guarda en un directorio privado por ejecución. El ejecutable se inicia desde el directorio nativo de solo lectura de Android y no se copia a almacenamiento escribible.
- El lock del repositorio registra los archivos oficiales y los binarios empaquetados. CI rechaza cambios de tamaño, SHA-256, tipo ELF, máquina o alineación antes de compilar.
- El plugin declara acceso a Internet porque scripts Bun de confianza pueden usar API de red como `fetch`. El plugin no es un sandbox, así que ejecuta solo scripts de confianza.

******

### Preguntas frecuentes

******

#### Por qué faltan los globals de AutoJs6 en Bun?

Bun es un proceso y motor JavaScript separado, no una capa compatible con Rhino. Un futuro puente deberá exponer cada capacidad de automatización de forma explícita; la versión 0.1 no incluye ese puente.

#### Puede un script importar otro archivo local del proyecto?

No en la versión 0.1. El contrato transfiere una única instantánea y todavía no transfiere un árbol de proyecto, por lo que no puede resolver importaciones relativas. La sintaxis ESM de un solo archivo sigue admitida.

#### Admite el plugin dispositivos con páginas de 16 KB?

Los PT_LOAD de ambos ejecutables ELF empaquetados están alineados al menos a 16 KB. Aún no se ha ejecutado una prueba real en Android de 16 KB, por lo que esta versión no afirma una compatibilidad integral verificada.

#### Qué APK debo instalar?

La mayoría de dispositivos Android físicos usan `arm64-v8a`. Usa `x86_64` baseline para emuladores o dispositivos x86_64 compatibles. `universal` incluye ambos y es la opción segura si se desconoce el ABI.

******

### Interfaz del plugin

******

Estos identificadores y límites estables están destinados a desarrolladores del host AutoJs6 y del plugin:

```text
application id: io.github.supermonster003.autojs6.plugin.bun.runtime
plugin id: bun-runtime
engine: bun
variant: bun-1.4.0-android
service action: org.autojs.plugin.bun.RUNTIME
service category: bun
aidl interface: org.autojs.plugin.bun.runtime.api.IBunRuntimePlugin
contract version: 1
aidl methods: getInfo(), getRuntimeInfo(), runScript(request, source, callback), cancelScript(executionId), prewarmRuntime()
minimum host build: 5278 (6.8.0)
source limit: 16 MiB
combined stdout/stderr streaming budget: 8 MiB
default timeout: 60 seconds
```

`BunRuntimeService` se descubre mediante la acción `org.autojs.plugin.bun.RUNTIME` y la categoría `bun`. Recibe el código mediante `ParcelFileDescriptor` y un ID de ejecución en la solicitud, y ejecuta `bun run --no-install <source>` mientras permanece activa la llamada sincrónica `runScript`. Stdout y stderr se envían solo en fragmentos limitados mediante el callback oneway. El Bundle terminal devuelto y el evento `finished` contienen campos de estado y resumen diagnóstico, nunca los streams completos, para mantener cada transacción Binder bajo su límite. El servicio admite cancelación explícita y precalentamiento y vive en `:bun_runtime`.

Estado de 16 KB: los segmentos PT_LOAD de los ELF `arm64-v8a` y `x86_64` empaquetados cumplen la alineación de 16 KB. Todavía no se ha ejecutado en un dispositivo o emulador Android real de 16 KB, por lo que solo está verificada la alineación ELF.

******

### Hoja de ruta

******

La hoja de ruta separa el comportamiento actual de las instantáneas de proyecto, un puente limitado de capacidades AutoJs6, una validación Android más amplia y futuras actualizaciones de Bun. Los elementos sin marcar son planes, no funciones actuales.

- [Ver ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Historial de versiones

******

#### v0.1.0

_2026/09/01_

- `Aviso` La primera versión ejecuta una instantánea y no expone globals de AutoJs6, un puente Java, proyectos con varios archivos ni importaciones relativas del proyecto
- `Función` Ejecutar JavaScript y TypeScript con el binario Android oficial de Bun 1.4.0 como motor `bun` independiente seleccionado por `"bun";`, usando `bun run --no-install <source>` sin instalar dependencias automáticamente
- `Función` Transmitir stdout y stderr solo como fragmentos limitados por callback oneway de Binder, mientras el resultado terminal informa del estado y los diagnósticos sin cargar los streams completos
- `Función` Admitir cancelación explícita, timeout predeterminado de 60 segundos, información del runtime y precalentamiento en el proceso aislado `:bun_runtime`
- `Función` Incluir binarios Android oficiales de 64 bits para `arm64-v8a` y baseline `x86_64`, además de paquetes de un solo ABI y `universal`
- `Función` Proporcionar descubrimiento, activación Wake protegida, metadatos PluginInfo completos y documentación de usuario en 10 idiomas
- `Mejora` Usar un contrato Binder versionado con transporte de código mediante ParcelFileDescriptor, límite de fuente de 16 MiB y límite de salida combinada de 8 MiB
- `Mejora` Iniciar Bun desde el directorio nativo de solo lectura de Android y verificar tamaños, SHA-256, tipo ELF, máquina y alineación de archivos oficiales y binarios empaquetados
- `Mejora` Verificar una alineación PT_LOAD de al menos 16 KB en ambos ejecutables y registrar expresamente que no se ha completado una prueba real en Android de 16 KB
- `Mejora` Generar README, instrucciones del centro de plugins y changelog integrado desde JSON validado, con comprobaciones CI de build, Markdown y artefactos runtime
- `Mejora` Exigir Android 14 (API 34) después de un `SIGSYS` app seccomp en API 31 por la syscall 436 `close_range` de Bun; un Sony API 33 pasó inesperadamente pero no es evidencia portable, mientras los recorridos Binder JS y TS en API 35 pasaron y versiones inferiores esperan un fallback upstream

##### Más historial de versiones

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-es.md)

******

### Compilación y verificación

******

Git LFS debe materializar los dos binarios fijados antes de verificar o empaquetar con Gradle. Las comprobaciones locales estándar se muestran abajo. Se requieren JDK 17 o posterior, Node.js y Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### Localización y generación de documentos

******

Edita los JSON y las plantillas Markdown y ejecuta `py .python/generate_markdown.py`. No edites a mano los README, changelog o archivos de instrucciones generados. `--check` valida sin escribir la forma de los idiomas, la versión, los recursos, los artefactos huérfanos y las diferencias de generación.

```text
.readme/common.json
.readme/lang_*.json
.readme/template_readme.md
.readme/template_plugin_instruction.md
.changelog/lang_*.json
.changelog/template_changelog.md
.python/generate_markdown.py
app/src/main/assets/doc/CHANGELOG-*.md
app/src/main/res/values*/strings.xml
app/src/main/res/raw*/plugin_instruction.md
```

******

### Licencia

******

El código del plugin usa [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). El ejecutable oficial de Bun incluye código de Bun bajo MIT, JavaScriptCore y WebKit enlazados estáticamente bajo LGPL-2 y otros componentes con sus propias licencias. Consulta [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) y el [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) fijado de Bun.

******

### Enlaces

******

- Proyecto AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Sitio oficial de Bun: https://bun.sh/
- Versión fijada de Bun: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- Avisos de terceros: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
