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

Bun Runtime es un plugin independiente que agrega a AutoJs6 un motor de scripts moderno opcional: [Bun](https://bun.sh/). Una vez instalado y activado el plugin, poner `"bun";` en la primera línea de un archivo JavaScript o TypeScript entrega ese archivo a un motor Bun 1.4.0 real en lugar del motor Rhino integrado, de modo que la sintaxis moderna de JavaScript, TypeScript y las API integradas de Bun como `fetch` quedan disponibles directamente en dispositivos Android.

El plugin funciona de forma sencilla: AutoJs6 envía el contenido del script al plugin, el plugin inicia el ejecutable Android oficial de Bun en su propio proceso aislado, y la salida junto con el resultado final vuelven a la consola de AutoJs6 en tiempo real. Es Bun auténtico, no un alias ni una capa de emulación sobre Rhino o Node.js.

******

### Instalación y uso

******

1. Prepara el entorno: instala AutoJs6 build 5278 (6.8.0) o posterior en Android 13 (API 33) o posterior.
2. Instala el plugin: descarga e instala el APK que corresponda al dispositivo desde [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). Elige `arm64-v8a` para la mayoría de teléfonos y tabletas, `x86_64` para emuladores o dispositivos x86_64, o `universal` si no estás seguro (algo más grande, funciona en ambos).
3. Activa el plugin: abre el centro de plugins de AutoJs6 y activa Bun Runtime. Si el plugin recién instalado aparece detenido, toca la acción `Activar` que muestra el host.
4. Ejecuta un script: pon `"bun";` solo en la primera línea de un archivo JavaScript o TypeScript (incluidas las comillas y el punto y coma) y ejecuta el archivo desde AutoJs6 como siempre.

> Cada ejecución procesa una instantánea del archivo actual (el comando real es `bun run --no-install <source>`); el plugin nunca instala dependencias npm automáticamente ni lee otros archivos del proyecto. Lee las limitaciones actuales más abajo antes de trasladar un proyecto Rhino o Node.js existente a Bun.

******

### Inicio rápido

******

Guarda el siguiente contenido como archivo de script y ejecútalo para confirmar que el motor Bun ha tomado el control de la ejecución:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

Si todo funciona, la primera línea de salida es `Bun 1.4.0` y la segunda es `android`.

Los archivos TypeScript también se ejecutan directamente, sin compilación previa ni configuración adicional:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

Hay más ejemplos comentados y listos para copiar y ejecutar en [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples): solicitudes de red, archivos del espacio de trabajo privado, stdout/stderr y tipos de TypeScript. Todos respetan los límites actuales de una sola fuente y `--no-install`.

******

### Funciones

******

- Un motor Bun real: los scripts los ejecuta directamente el ejecutable Android oficial de Bun 1.4.0, sin transpilación y sin reenvío a otros motores de AutoJs6.
- TypeScript listo para usar: los archivos TS se ejecutan directamente sin paso de compilación ni configuración extra, y funcionan la sintaxis moderna de JavaScript, la sintaxis ESM dentro de un solo archivo y las API de Bun disponibles en la compilación Android fijada.
- Ejecución transparente: la salida como `console.log` vuelve a la consola de AutoJs6 en tiempo real, y el resultado final informa del estado de salida, la duración y si la ejecución agotó el tiempo o fue cancelada.
- Estable y controlable: cada script se ejecuta en un proceso aislado del plugin, puede cancelarse en cualquier momento y se termina automáticamente al agotarse el tiempo, así que un script problemático nunca arrastra a AutoJs6.
- Procedencia verificable del motor: el ejecutable Bun incluido corresponde byte a byte a la versión oficial, y su tag, commit, tamaño, SHA-256 y propiedades ELF se verifican durante la compilación y en CI.
- Entrega totalmente localizada: los metadatos del plugin, las instrucciones del centro de plugins, el README y el changelog cubren 10 idiomas, todos generados desde un único conjunto de fuentes validado.

******

### Limitaciones actuales

******

- Un archivo por ejecución: el plugin recibe y ejecuta una única instantánea de código fuente sin el directorio del proyecto, así que las importaciones relativas como `import './utils.js'` no pueden resolverse. La sintaxis ESM dentro del archivo único no se ve afectada; cuando se necesiten varios módulos, empaquétalos antes en un solo archivo en un ordenador (ver las preguntas frecuentes).
- Sin funciones integradas de AutoJs6: las API de automatización como `click()` y `toast()` y los globals de Rhino no existen dentro de los scripts Bun, así que estos scripts se adaptan por ahora a tareas que no dependen del host, como cálculo, procesamiento de texto y peticiones de red.
- Sin puente Java: los scripts Bun no pueden acceder directamente a clases u objetos Java del proceso de AutoJs6.
- Sin promesa de toolchain completo de Bun: `bunx`, la generación de ejecutables en el dispositivo, la compilación C en runtime y los addons nativos arbitrarios quedan fuera del alcance admitido.
- No es un sandbox de seguridad: un script Bun se ejecuta como código de confianza en el proceso del plugin y puede usar los permisos concedidos al plugin, así que ejecuta solo scripts en los que confíes.

******

### Preguntas frecuentes

******

#### Por qué funciones de AutoJs6 como `click()` y `toast()` no están disponibles en los scripts Bun?

Bun se ejecuta en un proceso separado y es un motor JavaScript completamente distinto de Rhino, así que los globals de AutoJs6 no aparecen dentro de los scripts Bun. Permitir que los scripts Bun llamen a capacidades de automatización requiere un puente del host que exponga cada capacidad de forma explícita; la versión actual no ofrece deliberadamente ese puente todavía. Consulta la hoja de ruta para conocer los planes.

#### Puedo usar paquetes npm?

No instalándolos en el dispositivo. El plugin siempre ejecuta con `--no-install` y nunca descarga dependencias. Si de verdad se necesita una biblioteca de terceros, empaqueta primero el script y sus dependencias JS puras en un solo archivo en un ordenador, por ejemplo con `bun build`, y ejecuta ese archivo en el dispositivo; los paquetes que dependen de addons nativos no pueden usarse de esta forma.

#### Puede un script hacer `import` de otros archivos del proyecto?

Por ahora no. El contrato del plugin transfiere una única instantánea de código sin el directorio del proyecto, así que las importaciones relativas no pueden resolverse. El soporte de proyectos multiarchivo está en la hoja de ruta, y la sintaxis ESM dentro del archivo único funciona con normalidad.

#### Por qué el mínimo es Android 13?

Bun invoca la llamada al sistema `close_range` de Linux (syscall 436), que la lista de permitidos de seccomp para apps en Android 12L y anteriores no incluye, así que el proceso Bun muere con `SIGSYS` (reproducido en un dispositivo real con API 31). Android 13 permite la llamada, y las pruebas en dispositivos reales con API 33 y API 35 pasaron. Dar soporte a versiones anteriores requiere parchear Bun; consulta la hoja de ruta para ver el progreso.

#### Qué ocurre cuando un script agota el tiempo o imprime demasiado?

Una ejecución está limitada a 60 seconds por defecto; al agotarse el tiempo, el proceso Bun se termina y el resultado se marca como expirado. Cuando la salida combinada de stdout y stderr supera 8 MiB, la ejecución termina con un error de límite de salida en lugar de truncarse en silencio. En ambos casos, divide la tarea o reduce la cantidad de salida.

#### Se admiten dispositivos con páginas de 16 KB?

Los dos ejecutables ELF empaquetados y todas las entradas de los APK superan las puertas de alineación de 16 KB. En un AVD de 16 KB con Android 16 (API 36), el APK `arm64-v8a` superó toda la suite de Binder mediante `libndk_translation`, pero el payload `x86_64` nativo aborta con código de salida 134 incluso con un script mínimo; arm64 nativo aún no se ha probado. Es evidencia parcial, por lo que esta versión todavía no afirma soporte general de 16 KB.

#### Qué APK debo instalar?

La mayoría de teléfonos y tabletas usan `arm64-v8a`. Usa `x86_64` baseline para emuladores o dispositivos x86_64. Si no estás seguro, instala `universal`, que contiene ambos ABI y es algo más grande pero la opción más segura.

******

### Compatibilidad

******

- Motor: Bun oficial 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Sistema: Android 13 (API 33) o posterior, con ejecutables oficiales de 64 bits para `arm64-v8a` y `x86_64` baseline. Android 9 a 12L (API 28 a 32) aún no se admiten; las preguntas frecuentes de arriba explican el motivo. Las pruebas en dispositivos reales con API 33 y API 35 pasaron.
- Host: AutoJs6 build 5278 o posterior, con contrato Bun runtime versión 1.
- Límites por ejecución: código fuente de hasta 16 MiB, salida combinada de stdout y stderr de hasta 8 MiB y timeout predeterminado de 60 seconds.
- Paquetes: los APK de un solo ABI mantienen la instalación más pequeña, mientras que el APK `universal`, más grande, contiene los dos ABI admitidos.

******

### Permisos e integridad

******

- Los componentes exportados de activación (Wake), info y runtime están protegidos por `org.autojs.permission.PLUGIN`, y AutoJs6 sigue realizando sus comprobaciones normales de autorización de plugins.
- La instantánea del script se guarda en un directorio privado por ejecución, y el ejecutable Bun se inicia desde el directorio de bibliotecas nativas de solo lectura de Android en lugar de copiarse a almacenamiento escribible.
- El lock del repositorio registra tanto los archivos oficiales de la versión como los binarios empaquetados en el APK; CI rechaza cualquier desviación de tamaño, SHA-256 o propiedades ELF antes de compilar.
- El plugin declara acceso a Internet porque los scripts Bun de confianza pueden usar API de red como `fetch`. El plugin no es un sandbox; ejecuta solo scripts en los que confíes.

******

### Interfaz del plugin

******

Esta sección está dirigida a desarrolladores del host AutoJs6 y de plugins; los usuarios normales pueden omitirla. Los identificadores y límites estables son:

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

Estado de 16 KB: ambos payloads ELF y sus entradas en los APK superan las puertas de alineación. En un AVD de 16 KB con Android 16 (API 36), `arm64-v8a` superó las 5 pruebas de Binder mediante `libndk_translation`, mientras que `x86_64` nativo aborta con código 134 en un script mínimo; arm64 nativo sigue sin probarse. No se afirma soporte general de 16 KB.

******

### Hoja de ruta

******

La hoja de ruta responde dos preguntas: qué funciona ahora y qué viene después. Los elementos marcados describen el comportamiento real de la versión actual; los elementos sin marcar (proyectos multiarchivo, un puente de capacidades de AutoJs6, soporte más amplio de versiones de Android, actualizaciones de Bun y más) son planes, no promesas de soporte actual.

- [Ver ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Historial de versiones

******

#### v0.2.0

_2026/09/01_

- `Aviso` Esta versión reduce el requisito mínimo de sistema de Android 14 a Android 13 (API 33); Android 9 a 12L (API 28 a 32) sigue sin soporte hasta que un runtime de Bun parcheado supere la validación de portabilidad
- `Corrección` Identificar el ABI del runtime instalado mediante el SHA-256 del payload fijado, en vez del orden de iteración de la tabla ABI, y hacer que el precalentamiento ejecute una prueba mínima de JavaScript para rechazar un runtime inutilizable antes de iniciar scripts de usuario
- `Corrección` Rechazar el runtime oficial x86_64 incompatible antes de iniciar el proceso cuando Android usa páginas mayores de 4 KiB, tras aislar el fallo en el límite de 4 KiB de JavaScriptCore fijado, sustituyendo un aborto determinista de Bun por un diagnóstico acotado
- `Mejora` Reducir el requisito mínimo de sistema: se conserva el payload Android oficial y fijado de Bun 1.4.0 y se relaja el límite inferior de soporte de Android 14 (API 34) a Android 13 (API 33), cubriendo más dispositivos
- `Mejora` Identificar la causa raíz de los fallos en versiones antiguas: desde Android 13 el seccomp del sistema permite la syscall raw `close_range` que Bun invoca, mientras que un fallo en dispositivo real con API 31 demuestra que API 28 a 32 requieren parchear el propio Bun y no basta con cambiar el manifest
- `Mejora` Preparar el futuro soporte de Android 9+: se establece un plan de parches del código fuente de Bun reproducible con exactitud (6 parches) y se fijan las entradas de build (NDK y contenedor fijados, 22 dependencias activas de Android release); esto establece una línea experimental separada y no modifica el runtime oficial incluido en los paquetes actuales
- `Mejora` Reforzar los controles de calidad del paquete: cada APK de Debug y Release verifica el ZIP alignment de 16 KB, el contenido ABI exacto y el tamaño y SHA-256 del payload fijado de Bun, y los bytes del payload instalado se cotejan en un dispositivo de prueba con Android 13
- `Mejora` Endurecer la cadena de suministro: se fijan los bytes exactos de 19 archivos fuente de Bun y 17 descargas de toolchain, se inventarían 181 entradas de integridad de Cargo y 172 del registro de Bun, y se añaden un materializer que rechaza sobrescrituras y una precomprobación de build de doble ABI protegida por la puerta `buildReady`
- `Mejora` Ampliar la biblioteca de ejemplos listos para copiar y ejecutar con casos comentados de fetch de red, archivos del espacio de trabajo privado, streaming de stdout/stderr y tipos de TypeScript más completos; añadir una puerta de documentación que exige la directiva `"bun";` en la primera línea y los límites de una sola fuente y sin instalación
- `Mejora` Validar la ejecución con 16 KB en un AVD Android 16 (API 36) forzando PAGE_SIZE=16384: el APK de ABI única `arm64-v8a` supera las 5 pruebas de instrumentación Binder mediante `libndk_translation`, mientras que el payload `x86_64` nativo aborta con código de salida 134 incluso con un script mínimo; por ello no se afirma soporte general de 16 KB
- `Mejora` Cerrar la parte de Cargo de la cadena de suministro experimental para Android 9+: bloquear y materializar los 181 archivos de crates.io (26,354,160 bytes), generar un directory source verificado con checksums y demostrar que el Cargo fijado carga todo el workspace de Bun con `--locked --offline` y un `CARGO_HOME` vacío; este resultado cubre solo las entradas de Cargo y no cierra por sí solo las demás entradas de build
- `Mejora` Cerrar la parte del registro de Bun de esa cadena: resolver 172 referencias del lock en 125 archivos npm únicos para Linux x64 (31,498,870 bytes), reconstruir una cache mínima desde los tarballs bloqueados y superar las tres instalaciones frozen en el contenedor Ubuntu fijado, sin red y con la cache de solo lectura; `esbuild@0.21.5` es la única dependencia con postinstall de confianza
- `Mejora` Completar la puerta de compilación reproducible del runtime parcheado sin distribuirlo: bloquear 155 archivos `.deb` del host (422,223,096 bytes) en una imagen OCI reproducible, ampliar el cierre de Cargo a 206 archivos únicos, ejecutar dos compilaciones limpias y sin red de ambos ABI de 64 bits con resultados idénticos byte a byte, y fijar auditorías ELF en Node puro; pasan las pruebas directas de shell en API 28 y 31, mientras siguen pendientes las puertas de APK y proceso de aplicación
- `Mejora` Implementar assets de Release verificables del código fuente correspondiente: mantener el código separado de los APK en el mismo Release; empaquetar Bun/WebKit/JSC exactos, 19 archivos native, 206 de Cargo y 125 de npm, además de patches, instrucciones de build/relink y un aviso público de licencias; dividir archivos grandes a 1.9 GB, vincular bytes de APK/runtime/source mediante un manifest legible por máquina y SHA256SUMS, y publicar el draft solo tras coincidir todos los SHA-256 de GitHub; esto registra verificación técnica automatizada, no aprobación legal
- `Dependencia` Añadir el runtime de Kotlin Parcelize para que R8 en Release conserve la clase compartida del contrato Parcelable

#### v0.1.0

_2026/09/01_

- `Aviso` Primera versión: cada ejecución procesa un único archivo de script independiente; las funciones integradas de AutoJs6, el puente Java, los proyectos multiarchivo y las importaciones relativas aún no están disponibles
- `Función` Añadir el motor `bun` independiente: escribe `"bun";` en la primera línea de un script para ejecutar JavaScript y TypeScript con el ejecutable Android oficial de Bun 1.4.0; el comando real es `bun run --no-install <source>` y las dependencias nunca se instalan automáticamente
- `Función` Devolver la salida en tiempo real: stdout y stderr se transmiten en fragmentos acotados mediante oneway Binder callback, y el resultado final solo informa estado y diagnóstico sin llevar el flujo de salida completo
- `Función` Ejecución controlable: los scripts se ejecutan en el proceso aislado del plugin `:bun_runtime`, con cancelación explícita, timeout predeterminado de 60 segundos, consulta de información del runtime y prewarming
- `Función` Proporcionar payloads Android oficiales de 64 bits para `arm64-v8a` y baseline `x86_64`, además de paquetes de un solo ABI y `universal`
- `Función` Ofrecer la experiencia completa de plugin: descubrimiento del plugin, activación protegida por permiso (Wake), metadatos PluginInfo completos y documentación de usuario en 10 idiomas
- `Mejora` Adoptar un contrato Binder versionado que transfiere el código fuente por ParcelFileDescriptor, con límite de 16 MiB para el código y de 8 MiB para la salida combinada
- `Mejora` Iniciar Bun desde el directorio read-only de native library de Android y verificar tamaño, SHA-256 y propiedades ELF de los archivos release fijados y los binarios empaquetados
- `Mejora` Verificar que ambos ejecutables empaquetados tienen PT_LOAD alignment de al menos 16 KB, documentando con honestidad que la prueba en un entorno Android real de 16 KB aún no se ha completado
- `Mejora` Generar el README, las instrucciones del centro de plugins y el changelog integrado desde fuentes JSON validadas, con comprobaciones de CI para build, Markdown y artefactos de runtime
- `Mejora` Fijar el mínimo provisional en Android 14 (API 34): en un dispositivo real con API 31 la syscall `close_range` de Bun es terminada por seccomp con `SIGSYS`, un dispositivo Sony con API 33 pasó inesperadamente pero no demuestra portabilidad, y las pruebas de ida y vuelta por Binder con JS y TS pasaron en un dispositivo real con API 35

##### Más historial de versiones

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-es.md)

******

### Compilación y verificación

******

Git LFS debe materializar los dos binarios fijados antes de verificar o empaquetar con Gradle. Las comprobaciones locales estándar se muestran abajo. Se requieren JDK 17 o posterior, Node.js y Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
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

El código del plugin usa [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). El ejecutable oficial de Bun incluye código de Bun bajo MIT, JavaScriptCore y WebKit enlazados estáticamente bajo LGPL-2 y otros componentes con sus propias licencias. Los Releases aplicables publican un aviso de licencia/relinking y los assets de código fuente correspondiente separados de los APK en el mismo Release, con un manifest legible por máquina y SHA256SUMS verificados mediante controles técnicos automatizados. Consulta [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) y el [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) fijado de Bun.

******

### Enlaces

******

- Proyecto AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Sitio oficial de Bun: https://bun.sh/
- Versión fijada de Bun: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- Avisos de terceros: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
