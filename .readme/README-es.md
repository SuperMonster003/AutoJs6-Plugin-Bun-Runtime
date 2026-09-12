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

16 KB: las comprobaciones de alineación ELF y APK pasan. En Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), el APK de desarrollo v0.2.1 solo arm64 con Bun oficial pasó las 8 pruebas de Binder dos veces sin traducción. El resultado anterior de ARM64 en un AVD x86_64 sigue siendo solo mediante traducción; x86_64 nativo aborta incluso con un script mínimo con código 134. Es evidencia de desarrollo limitada al dispositivo, no aceptación de un APK de Release publicado ni soporte general de 16 KB.

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

- Un supervisor separado, fijado y de solo lectura gestiona el tiempo máximo, la cancelación y los límites de salida, incluso si el script ignora SIGTERM. Recoge el proceso Bun directo; no es una zona aislada ni un gestor de todos los descendientes desconectados.
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

16 KB: las comprobaciones de alineación ELF y APK pasan. En Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), el APK de desarrollo v0.2.1 solo arm64 con Bun oficial pasó las 8 pruebas de Binder dos veces sin traducción. El resultado anterior de ARM64 en un AVD x86_64 sigue siendo solo mediante traducción; x86_64 nativo aborta incluso con un script mínimo con código 134. Es evidencia de desarrollo limitada al dispositivo, no aceptación de un APK de Release publicado ni soporte general de 16 KB.

******

### Hoja de ruta

******

La hoja de ruta responde dos preguntas: qué funciona ahora y qué viene después. Los elementos marcados describen el comportamiento real de la versión actual; los elementos sin marcar (proyectos multiarchivo, un puente de capacidades de AutoJs6, soporte más amplio de versiones de Android, actualizaciones de Bun y más) son planes, no promesas de soporte actual.

- [Ver ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Historial de versiones

******

#### v0.2.2

_2026/09/12_

- `Corrección` Corregir el aborto de inicio experimental de JavaScriptCore en x86_64 nativo de 16 KiB reconstruyendo WebKit fijado con configuración explícita de páginas grandes, JIT y asignadores y reenlazando Bun: dos rondas Binder pasan en AVD de 4 KiB y 16 KiB (32/32). Los binarios oficiales y su límite de 4 KiB no cambian; la aceptación Release es independiente
- `Mejora` Añadir un observador SIGSYS independiente de prueba: cuatro fallos en ARM64 nativo con API 28 identifican directamente pidfd_open, con fallos equivalentes sin seguimiento y controles correctos en API 31. Vincular evidencia original, conservar el fallo inicial de la herramienta y verificar reenvío de señales, rechazo de alteraciones y limpieza; el diagnóstico no valida un nuevo runtime, Binder ni Release
- `Mejora` Añadir dos pruebas fijas de spawn asíncrono con SIGSYS bloqueada sin cambiar las 29 definiciones originales ni los bytes nativos: cuatro entornos nativos de 4 KiB superan 248/248, pero Sony API 28 falla dos veces en ambos modos nuevos con salida 159 (58/62 en total). Conservar los cuatro fallos en un archivo estricto separado y mantener pendiente la validación de compatibilidad; limpiar paquetes, procesos UID y el AVD de esta sesión, sin nueva aceptación de Binder, 16 KiB ni Release
- `Mejora` Completar la cobertura ARM64 nativa de 16 KiB de los cuatro modos de límite duro de FD en Samsung SM-A566B / API 36: el mismo APK y las 29 pruebas sin cambios pasan dos rondas (58/58), incluidos ocho casos con close_range nativo y alternativa tras TRAP forzado. Verificar cero procesos UID tras desinstalar sin operar AVD; siete entornos suman 406/406. Sin recompilar binarios nativos, repetir Binder ni aceptar Release
- `Mejora` Validar Samsung Galaxy Z Fold4 SM-F936U con API 32 / Android 12L real, ARM64 nativo y páginas de 4 KiB: dos rondas superan la suite Binder existente (16/16) y las 29 pruebas de aplicación sin cambios (58/58), incluidos los ocho casos de límite estricto. Vincular APK, fuentes y evidencias originales, eliminar los tres paquetes de prueba y verificar cero procesos UID sin operar ningún AVD. Los binarios no cambian; siguen pendientes los nuevos casos con ARM64 nativo de 16 KiB, la matriz ampliada y la aceptación Release
- `Mejora` Se agregan cuatro sondas Android de límite duro de FD sin cambiar las 25 definiciones ni los bytes del runtime: dos rondas de 29/29 en cinco entornos nativos de 4 KiB (290/290), con 40 casos de límite duro. Se verifica CLOEXEC al iniciar y ambas API spawn tras reducir los límites blando/duro a 128, conservando los de la aplicación y supervisor. Evidencia original vinculada, paquetes de prueba desinstalados y AVD de esta sesión cerrado; siguen pendientes FD 70000, los nuevos casos nativos de 16 KiB y la validación Release
- `Mejora` Añadir una validación de carga JSC acotada e independiente en API 36 x86_64: siete modos sin conexión pasan dos veces con páginas de usuario de 4 KiB y 16 KiB emuladas (28/28), con muestras reales de LLInt/Baseline/DFG/FTL, GC, Wasm y 64 salidas normales de workers. Los mismos APK también pasan la suite Binder sin cambios (32/32). Registrar por separado los mapeos de kernel de 4 KiB, conservar los resultados preliminares y limpiar los dispositivos propios; los binarios nativos, el soporte estable y las puertas de Release no cambian
- `Mejora` Completar la validación nativa x86_64 / 4 KiB en API 29 y 32: dos rondas por entorno agregan 32/32 pruebas Binder y 100/100 sondas de aplicación sin cambios, completando la cobertura Binder x86 de API 28-32. Archivar con verificación estricta de informes originales, fuentes y limpieza; conservar la evidencia histórica, mantener pendientes ARM64 API 32 y Release, y cerrar solo los dos AVD iniciados para esta ejecución
- `Mejora` Agregar un plugin de prueba opcional con paquete independiente que reutiliza el servicio de producción y los ocho tests Binder completos con Bun de nueve parches: dos rondas pasan en nueve entornos nativos (144/144), incluido ARM64 de 16 KiB; conservar vínculos APK/fuentes y pruebas de limpieza sin ampliar el soporte estable
- `Mejora` Agregar una prueba CLI fija sin red para lchmod/fchmodat2 interno sin cambiar los binarios ni las 24 pruebas originales: las 25 pasan dos veces en seis entornos nativos (300/300), incluido ARM64 de 16 KiB. Verificar permisos, enlaces repetidos, no-follow, EIO ignorado y alcance con SIGSYS y limpieza acotada de hilos; conservar los fallos iniciales del arnés, eliminar los paquetes de prueba y cerrar el AVD iniciado. Siguen pendientes Binder experimental completo y Release
- `Mejora` Validar Bun experimental de nueve parches en Samsung ARM64 nativo / API 36 / 16 KiB con el mismo APK y las 24 pruebas sin cambios: 48/48 en dos rondas, 48 comprobaciones de rutas correctas y 12 solicitudes de escape rechazan el centinela; desinstalar el paquete de prueba sin procesos UID restantes ni iniciar o apagar AVD. Siguen pendientes Binder experimental completo, Release y x86_64 16 KiB
- `Mejora` Verificación de compilación de la alineación de páginas de 16 KB en bibliotecas nativas de 64 bits, con controles del contrato manifest e informes JSON
- `Dependencia` Alinear el plugin en línea platform-versions con la versión 1.7.4 fijada por el repositorio, sin cambiar native-alignment

#### v0.2.1

_2026/09/10_

- `Aviso` Versión de desarrollo aún no publicada; el plugin oficial sigue requiriendo Android 13 (API 33) o posterior
- `Corrección` Conservar el servicio experimental de directorios estáticos sin openat2 mediante una alternativa MIT fijada y relativa a descriptores: fijar componentes, resolver enlaces dentro de la raíz, rechazar enlaces externos y mágicos, y limitar el recorrido, los errores y la propiedad de FD; sin cambiar Bun.file/node:fs, el motor oficial ni el mínimo Android 13
- `Corrección` Corregir la alternativa Linux spawn FD del runtime experimental con un parche MIT fijado: enumerar los descriptores reales mediante syscall directas y un búfer fijo en la pila, cubrir FD por encima de límites blandos/duros reducidos y del antiguo techo 65536, y fallar antes de exec si el aislamiento es incompleto; añadir regresiones de vfork/exec, errores, símbolos y controles con la implementación anterior sin cambiar Bun oficial ni el mínimo Android 13
- `Corrección` Corregir el fallback CLOEXEC de inicio de Bun experimental con un parche MIT fijado: enumerar descriptores abiertos sin imponer un límite a los números de fd, conservar los fd 0-3 y salir si el marcado no se completa; añadir pruebas nativas de errores y límites y separar la verificación de entradas de la aceptación del runtime, sin cambiar el runtime oficial ni el mínimo Android 13
- `Corrección` Corregir la limpieza por tiempo agotado, cancelación y límite de salida del complemento oficial con un supervisor fijado de solo lectura: escalar SIGTERM ignorado a SIGKILL, esperar la salida del proceso Bun directo y conservar la salida pendiente; Bun 1.4.0 y el mínimo Android 13 no cambian
- `Corrección` Corregir la terminación de la sonda aislada de Bun modificado compilando el contenedor compartido SupervisedProcess e incluyendo el supervisor fijado; vincular fuentes, herramientas y supervisor en recibos de esquema 2 y mantener abiertos los lectores de salida hasta la terminación
- `Mejora` Validar la alternativa de directorios con dos compilaciones limpias idénticas por ABI y las mismas 24 pruebas dos veces en cinco entornos nativos de 4 KiB (240/240): las 60 aserciones de escape antes fallidas rechazan el centinela y el servicio normal funciona. Pasan GCC/Clang y GCC ASan/UBSan; se limpian paquetes y AVD. Conservar fallos previos; quedan ARM64 nativo de 16 KiB, Binder completo y publicación
- `Mejora` Referencia anterior de fallo (a260ef308): Añadir una prueba número 24 de confinamiento de directorios con openat2 sin cambiar el runtime experimental: cinco entornos nativos de 4 KiB obtienen 23/24 dos veces. Pasan las 230 observaciones originales, pero 10 fallos nuevos registran 60 lecturas de un centinela sintético fuera de la raíz configurada mediante enlaces relativos, absolutos y mágicos. Archivar la validación fallida sin relajar aserciones; no hay cierres inesperados, bloqueos ni procesos residuales del UID de prueba, y se cierra el AVD iniciado. La corrección nativa sigue pendiente
- `Mejora` Corregir la auditoría de fchmodat2: sys::lchmod interno usa SYS_FCHMODAT2 en mayúsculas, mientras que ambas exportaciones públicas lchmod de node:fs en Android están ausentes en las 10 rondas. No se ejecutó la alternativa interna de enlaces de ejecutables de paquetes ni se instalaron dependencias; conservar el informe histórico y mantener bloqueada la distribución
- `Mejora` Ampliar a 23 pruebas la suite de syscalls del runtime experimental sin cambiar sus bytes: cinco entornos nativos de 4 KiB pasan dos rondas (230/230), con 60 observaciones TRAP a ENOSYS y 16 alternativas de copia/espera controladas mediante EIO; excluir explícitamente cuatro casos de API 28 limitados por el kernel o la política como prueba de acceso a la rama, preservar las aserciones y evidencias anteriores, y limpiar los paquetes de prueba y el AVD iniciado. Siguen pendientes las matrices completas de syscalls/Binder y las nuevas pruebas nativas de 16 KiB
- `Mejora` Validar la corrección de spawn en seis entornos nativos: las mismas 20 pruebas pasan dos veces en arm64 API 28/31/33/35 y x86_64 API 33 (4 KiB), además de Samsung arm64 API 36 (16 KiB), con un total de 240/240; ambos ABI se reproducen en dos compilaciones limpias, pasan los 36 casos de terminación forzada y se limpian los paquetes de prueba y el AVD iniciado. Se conservan los fallos anteriores; siguen pendientes la validación completa de Binder experimental y la publicación
- `Mejora` Validar ejecución ARM64 nativa con 16 KiB en Samsung Remote Test Lab SM-A566B (API 36): el APK de desarrollo v0.2.1 solo arm64 con Bun oficial y el supervisor fijado pasa las 8 pruebas de Binder dos veces, con reinicio del proceso, hashes instalados y 10 casos de terminación forzada; archivar vínculos exactos de fuente/APK/registros y desinstalar las pruebas, manteniendo separadas las puertas de Release y x86_64
- `Mejora` Fallos de referencia anteriores (c240d6c68): Registrar el runtime experimental sin cambios en el mismo dispositivo ARM64 nativo de 16 KiB con 19/20 dos veces: pasan close_range nativo, marcado al inicio y ciclo de vida, pero persiste la fuga conocida de spawn con TRAP forzado y RLIMIT_NOFILE reducido; conservar ambos fallos sin afirmar aceptación completa de Binder experimental ni del runtime
- `Mejora` Fallos de referencia anteriores (c240d6c68): Ampliar la suite experimental a 20 pruebas con controles de RLIMIT_NOFILE reducido: cuatro dispositivos arm64 nativos (API 28/31/33/35) obtienen 18/20 dos veces y un AVD x86_64 nativo con API 33 obtiene 19/20 dos veces, todos con páginas de 4 KiB. Las 180 observaciones originales siguen pasando; 18 fallos nuevos muestran que ambas API de spawn heredan fd 256 al reducir el límite flexible a 128. Archivar los fallos, la restauración de límites y la limpieza sin cambiar el runtime ni dar el defecto por corregido
- `Mejora` Documentar opciones de prueba ARM64 con páginas de 16 KiB para Windows x64: VMware y WSL por sí solos no proporcionan Android ARM64 nativo; distinguir la emulación de sistema completo y proponer dispositivos Samsung remotos de 16 KiB mediante RDB/ADB, sujetos a disponibilidad y permisos reales, sin afirmar una nueva validación de dispositivos
- `Mejora` Resultado previo de 18 pruebas: Añadir cinco pruebas FD/SIGSYS y validar la corrección de inicio: cuatro dispositivos arm64 nativos (API 28/31/33/35) y un AVD x86_64 nativo con API 33 pasan 18/18 dos veces, 180/180 en total; ambos ABI se reproducen idénticamente en dos compilaciones limpias. Conservar los informes previos de fallo 17/18, sin cambiar el runtime oficial ni el mínimo Android 13; Binder experimental completo y la ejecución nativa con páginas de 16 KB siguen pendientes
- `Mejora` Vincular el código del supervisor, las instrucciones con NDK fijo y sus hashes por ABI en el esquema 2 de corresponding-source, verificando los archivos exactos del paquete fuente sin modificar los recursos de v0.2.0
- `Mejora` Añadir herramientas para compilar un APK aislado solo de prueba y ejecutarlo en un dispositivo explícito con Bun modificado reproducible, verificaciones exactas de fuentes/APK/runtime, firma temporal y reportes acotados legibles por máquina
- `Mejora` Superar las 13 pruebas de proceso de aplicación dos veces en dispositivos arm64 nativos con API 28, 31, 33 y 35: 24 casos que ignoran SIGTERM por tiempo agotado, límite de salida o cancelación tras estar listos confirman la salida del hijo y del supervisor y la limpieza del directorio; conservar el informe original 10/12 sin afirmar compatibilidad Binder experimental completa ni ampliar el soporte Android
- `Mejora` Archivar la verificación de APK y fuentes publicados con v0.2.0 y la aceptación de paquetes firmados en dispositivos, sin reescribir la etiqueta publicada ni ampliar la compatibilidad con Android o páginas de 16 KB
- `Dependencia` Actualizar el plugin de compilación en línea autojs6-platform-versions de 1.7.3 a 1.7.4 y sincronizar el requisito de versión del repositorio

#### v0.2.0

_2026/09/08_

- `Aviso` Esta versión reduce el requisito mínimo de sistema de Android 14 a Android 13 (API 33); Android 9 a 12L (API 28 a 32) sigue sin soporte hasta que un runtime de Bun parcheado supere la validación de portabilidad
- `Corrección` Reforzar la verificación de los recursos de Release: comprobar el tamaño y SHA-256 del archivo de WebKit frente al registro fijado y admitir los distintos formatos de salida de apksigner
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
