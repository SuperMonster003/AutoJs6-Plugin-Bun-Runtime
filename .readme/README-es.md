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

El plugin funciona de forma sencilla: AutoJs6 envía el contenido del script al plugin, el plugin inicia el ejecutable Android oficial de Bun en su propio proceso aislado, y la salida junto con el resultado final vuelven a la consola de AutoJs6 en tiempo real. Es Bun auténtico, no un alias ni una capa de emulación sobre Rhino o Node.js. En Android 17 o posterior, permita Dispositivos cercanos antes de activar este plugin en el centro de plugins de AutoJs6. También puede gestionar el permiso de red local en los ajustes del plugin. Sin permiso, el plugin permanece desactivado y el inicio automático se omite sin avisos. El permiso pertenece al plugin y es independiente del permiso de AutoJs6.

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

Bun se ejecuta en un proceso separado y es un motor JavaScript completamente distinto de Rhino, así que los globals de AutoJs6 no aparecen dentro de los scripts Bun. Permitir que los scripts Bun llamen a capacidades de automatización requiere un puente del host que exponga cada capacidad de forma explícita; la versión actual no ofrece deliberadamente ninguna interfaz de automatización. La primera capacidad de solo lectura (una instantánea de información del host: un archivo JSON señalado por la variable de entorno `AUTOJS6_HOST_INFO_FILE` con las versiones del host y del plugin) ya está implementada en el plugin, igual que la segunda parte: llamadas en tiempo de ejecución (`ui.toast` y `device.info`) que los scripts realizan mediante `fetch(url, { unix })` sobre el socket unix indicado por la variable de entorno `AUTOJS6_HOST_BRIDGE_SOCKET`. Ambas podrán usarse cuando AutoJs6 publique la versión del host correspondiente, y cada capacidad puede desactivarse en la página de ajustes del plugin dentro del centro de plugins de AutoJs6. Consulta la hoja de ruta para conocer los planes.

#### Puedo usar paquetes npm?

No instalándolos en el dispositivo. El plugin siempre ejecuta con `--no-install` y nunca descarga dependencias. Si de verdad se necesita una biblioteca de terceros, empaqueta primero el script y sus dependencias JS puras en un solo archivo en un ordenador, por ejemplo con `bun build`, y ejecuta ese archivo en el dispositivo; los paquetes que dependen de addons nativos no pueden usarse de esta forma.

#### Puede un script hacer `import` de otros archivos del proyecto?

Con la AutoJs6 publicada actualmente, todavía no. Desde el plugin 0.2.2 el runtime acepta una instantánea de proyecto (un archivo ZIP de espacio de trabajo acotado) y la expande en el espacio de trabajo privado de cada ejecución, por lo que las importaciones relativas dentro del proyecto se resuelven. El host debe empaquetar el directorio del proyecto y declarar esa capacidad; ese cambio del host está preparado pero aún no publicado. Hasta entonces solo se transfieren instantáneas de un único archivo, y la sintaxis ESM dentro de ese archivo funciona con normalidad.

#### Por qué el mínimo es Android 13?

Bun invoca la llamada al sistema `close_range` de Linux (syscall 436), que la lista de permitidos de seccomp para apps en Android 12L y anteriores no incluye, así que el proceso Bun muere con `SIGSYS` (reproducido en un dispositivo real con API 31). Android 13 permite la llamada, y las pruebas en dispositivos reales con API 33 y API 35 pasaron. Dar soporte a versiones anteriores requiere parchear Bun; consulta la hoja de ruta para ver el progreso.

#### Qué ocurre cuando un script agota el tiempo o imprime demasiado?

Una ejecución está limitada a 60 seconds por defecto; al agotarse el tiempo, el proceso Bun se termina y el resultado se marca como expirado. Cuando la salida combinada de stdout y stderr supera 8 MiB, la ejecución termina con un error de límite de salida en lugar de truncarse en silencio. En ambos casos, divide la tarea o reduce la cantidad de salida.

#### Se admiten dispositivos con páginas de 16 KB?

16 KB: las comprobaciones de alineación ELF y APK pasan. En Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), el APK de desarrollo v0.2.1 solo arm64 con Bun oficial pasó las 8 pruebas de Binder dos veces sin traducción. El resultado anterior de ARM64 en un AVD x86_64 sigue siendo solo mediante traducción; x86_64 nativo aborta incluso con un script mínimo con código 134. Es evidencia de desarrollo limitada al dispositivo, no aceptación de un APK de Release publicado ni soporte general de 16 KB.

#### Qué APK debo instalar?

La mayoría de teléfonos y tabletas usan `arm64-v8a`. Usa `x86_64` baseline para emuladores o dispositivos x86_64. Si no estás seguro, instala `universal`, que contiene ambos ABI y es algo más grande pero la opción más segura.

#### Dónde puedo resolver problemas de instalación y ejecución?

Consulta la [guía de solución de problemas (en chino)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/troubleshooting.md) para un script mínimo, comprobaciones de activación, Android, ABI, tamaño de página, tiempo de espera, límites de salida e importaciones, y los datos necesarios para informar de un fallo.

******

### Compatibilidad

******

- Motor: Bun oficial 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Sistema: Android 13 (API 33) o posterior, con ejecutables oficiales de 64 bits para `arm64-v8a` y `x86_64` baseline. Android 9 a 12L (API 28 a 32) aún no se admiten; las preguntas frecuentes de arriba explican el motivo. Las pruebas en dispositivos reales con API 33 y API 35 pasaron.
- Host: AutoJs6 build 5278 o posterior, con contrato Bun runtime versión 1.
- Límites por ejecución: código fuente de hasta 16 MiB, salida combinada de stdout y stderr de hasta 8 MiB y timeout predeterminado de 60 seconds.
- Paquetes: los APK de un solo ABI mantienen la instalación más pequeña, mientras que el APK `universal`, más grande, contiene los dos ABI admitidos.
- Evidencia de pruebas: la [matriz de compatibilidad generada (en chino)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/compatibility/MATRIX.md) enumera dispositivos, niveles de API, ABI, tamaños de página y resultados de cada conjunto registrado. Las ejecuciones oficiales, experimentales, traducidas y fallidas conservan su propio alcance; estos registros no amplían el soporte publicado.

******

### Permisos e integridad

******

- Un supervisor separado, fijado y de solo lectura gestiona el tiempo máximo, la cancelación y los límites de salida, incluso si el script ignora SIGTERM. Recoge el proceso Bun directo; no es una zona aislada ni un gestor de todos los descendientes desconectados.
- Los componentes exportados de activación (Wake), info y runtime están protegidos por `org.autojs.permission.PLUGIN`, y AutoJs6 sigue realizando sus comprobaciones normales de autorización de plugins.
- La instantánea del script se guarda en un directorio privado por ejecución, y el ejecutable Bun se inicia desde el directorio de bibliotecas nativas de solo lectura de Android en lugar de copiarse a almacenamiento escribible.
- El lock del repositorio registra tanto los archivos oficiales de la versión como los binarios empaquetados en el APK; CI rechaza cualquier desviación de tamaño, SHA-256 o propiedades ELF antes de compilar.
- El plugin declara acceso a Internet porque los scripts Bun de confianza pueden usar API de red como `fetch`. El plugin no es un sandbox; ejecuta solo scripts en los que confíes.

******

### Errores de ejecución y soluciones

******

Los mensajes usan el idioma de Android para el complemento. Los detalles de diagnóstico de bajo nivel y la salida de Bun pueden seguir en inglés.

- Si Bun Runtime no está activado o habilitado, abre el Centro de complementos en AutoJs6, autoriza y habilita el complemento y usa Activar si el anfitrión lo muestra.
- El complemento oficial requiere Android 13 (API 33) o posterior. No puede ejecutarse en Android 9 a 12L; reducir el requisito del manifiesto no hace compatible el entorno de ejecución.
- `TIMEOUT`: La ejecución de Bun agotó el tiempo de espera. Acorta la tarea o ajusta el tiempo de ejecución dentro del límite permitido.
- `OUTPUT_LIMIT`: La salida de Bun superó el límite de bytes configurado. Reduce la salida de stdout y stderr y ejecuta el script de nuevo.
- `RUNTIME_UNAVAILABLE`: Bun Runtime no está disponible. Comprueba la compatibilidad del dispositivo y reinstala el complemento si sus archivos están incompletos.

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

16 KB: las comprobaciones de alineación ELF y APK pasan. En Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), el APK de desarrollo v0.2.1 solo arm64 con Bun oficial pasó las 8 pruebas de Binder dos veces sin traducción. El resultado anterior de ARM64 en un AVD x86_64 sigue siendo solo mediante traducción; x86_64 nativo aborta incluso con un script mínimo con código 134. Es evidencia de desarrollo limitada al dispositivo, no aceptación de un APK de Release publicado ni soporte general de 16 KB.

******

### Hoja de ruta

******

La hoja de ruta responde dos preguntas: qué funciona ahora y qué viene después. Los elementos marcados describen el comportamiento real de la versión actual; los elementos sin marcar (proyectos multiarchivo, un puente de capacidades de AutoJs6, soporte más amplio de versiones de Android, actualizaciones de Bun y más) son planes, no promesas de soporte actual.

- [Ver ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Historial de versiones

******

#### v0.2.5

_2026/09/16_

- `Aviso` Versión de desarrollo aún no publicada; el plugin oficial sigue requiriendo Android 13 (API 33) o posterior
- `Mejora` Archiva la verificación de los activos APK/fuente publicados de v0.2.4 y la aceptación del APK final firmado en cuatro entornos sobre los bytes finales de la publicación: actualizaciones in situ desde la v0.2.3 publicada en Sony API 33 arm64 y Xiaomi API 35 universal, instalaciones limpias en Redmi API 33 arm64 y un AVD x86_64 API 33, cada una con 11/11 grupos antes y después de force-stop (el undécimo grupo es el puente de capacidades dinámicas con un broker en el mismo proceso); no hubo dispositivo de 16 KiB disponible y las cargas del runtime no cambian desde v0.2.2; la etiqueta publicada no se reescribe y la compatibilidad Android/16 KB no se amplía

#### v0.2.4

_2026/09/16_

- `Función` M7 segunda parte: el puente de capacidades para llamadas dinámicas en tiempo de ejecución y las dos primeras capacidades dinámicas `ui.toast` / `device.info`. Cuando el host incluye `hostCapabilityBridgeVersion = 1`, `hostCapabilityBroker` (un IBinder) y `hostCapabilities` (los ID de capacidad concedidos) en la solicitud runScript, el plugin abre un socket unix por ejecución en su directorio de caché privado (variable de entorno `AUTOJS6_HOST_BRIDGE_SOCKET`); los scripts envían `GET /v1/info` y `POST /v1/<ID de capacidad>` mediante `fetch(url, { unix })` (solicitudes JSON de hasta 64 KiB, resultados de hasta 256 KiB, máximo 1024 llamadas por ejecución, 4 en curso, 10 s por llamada) y el plugin las retransmite por el AIDL oneway `IBunHostCapabilityBroker`, aceptando solo las respuestas del UID del host para esta ejecución. Los códigos de error del puente (INVALID_REQUEST 400, NOT_GRANTED 403, UNKNOWN_CAPABILITY 404, PAYLOAD_TOO_LARGE 413, TOO_MANY_REQUESTS/QUOTA_EXCEEDED 429, HOST_UNAVAILABLE 503, TIMEOUT 504, INTERNAL 500) solo aparecen en las respuestas JSON; los códigos de error terminales de runScript no cambian y el Bundle terminal añade `hostBridgeDelivered` y `hostCalls`; el socket y toda llamada pendiente se cierran al terminar la ejecución. Clave de capacidad `SUPPORTS_HOST_CAPABILITY_BRIDGE`, AAR del contrato compartido ahora de 22437 bytes; los hosts que no ofrecen el puente no notan ningún cambio
- `Mejora` Autorización de red local de Android 17 integrada en la activación y los ajustes del plugin, sin página de permisos en el lanzador; sin permiso, el plugin permanece desactivado y se omite el inicio automático sin avisos
- `Mejora` Archivar la verificación de APK y fuentes publicados con v0.2.3 y la aceptación de los APK finales firmados en cinco entornos sobre los bytes finales publicados: actualización sobre la v0.2.2 publicada en Sony API 33 arm64 y Xiaomi API 35 universal, instalación limpia en Redmi API 33 arm64, un AVD x86_64 API 33 y un Samsung SM-A566B API 36 arm64 nativo con páginas de 16 KiB, cada uno con 10/10 grupos antes y después de force-stop (el décimo grupo es la instantánea de información del host); la etiqueta publicada no se reescribe y la compatibilidad Android/16 KB no se amplía
- `Mejora` Compatibilidad con Android 17 (SDK 37), controles de permiso de red local propios del plugin y ayuda para recuperar el acceso

#### v0.2.3

_2026/09/16_

- `Función` Primera capacidad del host de M7: una instantánea de solo lectura con información del host. Cuando el host envía `hostInfoVersion = 1` y `hostInfo` (nombre del paquete, versionDate y languageTag opcionales) en la solicitud runScript, el plugin comprueba que el paquete pertenece al UID del llamador de Binder, resuelve por sí mismo la versión del host mediante PackageManager, escribe los datos del host, del plugin y de la ejecución como un JSON de como máximo 16 KiB en `autojs6/host-info.json` dentro del directorio de la ejecución (fuera de `project`, se elimina con la ejecución) y se lo indica al script mediante la variable de entorno `AUTOJS6_HOST_INFO_FILE`; el Bundle terminal añade `hostInfoDelivered`. Capacidad `SUPPORTS_HOST_INFO`; el prefijo de entorno `AUTOJS6_` queda reservado para el plugin (una solicitud del host que lo use se rechaza con INVALID_REQUEST) y un paquete suplantado o una versión desconocida se rechazan antes de arrancar Bun. El AAR del contrato compartido pasa a 14073 bytes; los hosts que no ofrecen la instantánea se comportan exactamente igual que antes
- `Mejora` Archivar la verificación de APK y fuentes publicados con v0.2.2 y la aceptación de los APK finales firmados en cuatro entornos: actualización sobre la v0.2.0 publicada en Sony API 33 arm64 y Xiaomi API 35 universal, instalación limpia en Redmi API 33 arm64 y en un AVD x86_64 API 33, cada uno con 9/9 grupos antes y después de force-stop; sin reescribir la etiqueta publicada ni ampliar la compatibilidad con Android o páginas de 16 KB
- `Mejora` Verificar el viaje de ida y vuelta real de un proyecto entre el host y el plugin con un AutoJs6 compilado localmente desde su master (7c31269cc) y el plugin v0.2.2 x86_64 publicado en un AVD API 33: un proyecto con project.json con importaciones relativas y JSON, un proyecto TypeScript con package.json y un archivo suelto de control que sigue fallando de forma cerrada; la publicación del propio host sigue pendiente
- `Mejora` Complementar la evidencia de la versión v0.2.2 con la aceptación del APK final firmado en hardware arm64 nativo de 16 KiB: el APK arm64-v8a publicado se instaló desde cero en Samsung SM-A566B (API 36, Remote Test Lab), superó 9/9 grupos antes y después de force-stop con los bytes instalados vinculados al recurso de la versión, y se desinstaló después; el registro ahora cubre cinco entornos
- `Mejora` Repetir el viaje de ida y vuelta real de un proyecto entre el host y el plugin en dos dispositivos ARM64 nativos con el mismo host AutoJs6 compilado localmente (master 7c31269cc) y el plugin v0.2.2 arm64-v8a publicado: Samsung SM-A566B (API 36, páginas de 16 KiB) y Redmi 22120RN86C (API 33) ejecutaron cada uno el proyecto project.json dos veces, el proyecto TypeScript package.json una vez y el archivo suelto de control, todos con el resultado esperado; la publicación del host sigue siendo decisión del usuario
- `Mejora` Ejecutar la suite de instrumentation con las dos pruebas nuevas (la instantánea se entrega y verifica solo cuando se ofrece, los globals del host fallan con ReferenceError) en Redmi 22120RN86C (API 33) y Samsung SM-A566B (API 36, páginas de 16 KiB), OK (17 tests) en cada uno, y completar en ambos dispositivos un viaje de ida y vuelta de la instantánea entre host y plugin con un host AutoJs6 compilado localmente (master d9b4033bd más attachHostInfo) y el plugin release 0.2.3 local: los lanzamientos de archivo único y de proyecto project.json leen los datos verificados de host/plugin/ejecución, el script no ve ninguna instantánea tras revocar la autorización del host y vuelve a recibirla al restaurarla, y el host se restauró al APK original del usuario; registrado en docs/compatibility/2026-09-16-m7-host-info-snapshot

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


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
