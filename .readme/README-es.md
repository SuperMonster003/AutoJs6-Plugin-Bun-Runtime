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

El plugin funciona de forma sencilla: AutoJs6 envía el contenido del script al plugin, el plugin inicia el ejecutable Android oficial de Bun en su propio proceso aislado, y la salida junto con el resultado final vuelven a la consola de AutoJs6 en tiempo real. Es Bun auténtico, no un alias ni una capa de emulación sobre Rhino o Node.js. En Android 17 o posterior, permite los dispositivos cercanos para este plugin para conectar con dispositivos de tu red local. El permiso de AutoJs6 no se comparte con este plugin. Internet público y las conexiones de bucle local no requieren este permiso. Si esta operación usa la red local, abre este plugin desde el centro de plugins de AutoJs6 y permite los dispositivos cercanos. El permiso de AutoJs6 no se comparte con este plugin.

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

Bun se ejecuta en un proceso separado y es un motor JavaScript completamente distinto de Rhino, así que los globals de AutoJs6 no aparecen dentro de los scripts Bun. Permitir que los scripts Bun llamen a capacidades de automatización requiere un puente del host que exponga cada capacidad de forma explícita; la versión actual no ofrece deliberadamente ninguna interfaz de automatización. La primera capacidad de solo lectura (una instantánea de información del host: un archivo JSON señalado por la variable de entorno `AUTOJS6_HOST_INFO_FILE` con las versiones del host y del plugin) ya está implementada en el plugin y podrá usarse cuando AutoJs6 publique la versión del host correspondiente. Consulta la hoja de ruta para conocer los planes.

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

#### v0.2.4

_2026/09/16_

- `Aviso` Versión de desarrollo aún no publicada; el plugin oficial sigue requiriendo Android 13 (API 33) o posterior
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

#### v0.2.2

_2026/09/15_

- `Función` Añade la ejecución de proyectos multiarchivo mediante archivos de espacio de trabajo (M6): el contrato compartido incorpora las claves de solicitud workspaceArchiveVersion, workspaceEntryPoint, workspaceMaxEntries y workspaceMaxBytes más la capacidad SUPPORTS_WORKSPACE_ARCHIVE, y runScript expande atómicamente una instantánea ZIP acotada en el espacio de trabajo privado de cada ejecución antes de ejecutar el archivo de entrada con el proyecto como directorio de trabajo. Reglas: solo rutas relativas, rechazo de rutas de escape, absolutas, con barra invertida, dos puntos o caracteres de control, detección de duplicados sin distinguir mayúsculas ni forma Unicode, comprobación de conflictos archivo/directorio, como máximo 16384 entradas, 64 MiB descomprimidos y 16 MiB por archivo, validación del punto de entrada y limpieza al cancelar; solo se crean archivos regulares y directorios, y los hosts sin la clave conservan la ruta de fuente única sin cambios. Requiere un host que empaquete el directorio del proyecto; el cambio del motor de AutoJs6 está preparado en paralelo y aún no publicado
- `Corrección` Lee los miembros del archivo de código fuente del proyecto mediante un nombre de archivo relativo para que la comprobación exacta del código del supervisor en el verificador de Release también funcione con GNU tar en Windows; la CI y los recursos publicados no cambian
- `Corrección` Corregir la fuga de descriptores durante la recarga experimental con watch cuando falla close_range: marcar los FD reales con CLOEXEC antes de exec mediante la alternativa acotada existente y detenerse si la preparación queda incompleta. Mantener stdio, IPC explícito y el ciclo de señales. Los controles GCC/Clang con fuentes completas cubren exec real, FD altos, límites duros reducidos y errores inyectados; registrar por separado las nuevas compilaciones nativas y las suites Android sin cambios. Preservar los fallos históricos, los binarios oficiales y los límites de distribución
- `Corrección` Corregir la verificación de candidatos JSC experimentales históricos tras actualizar las fuentes de Bun: vincular el archivo completo e inmutable de compilación y mantener las comprobaciones estrictas de entradas actuales para las nuevas compilaciones
- `Corrección` Corregida la entrega prematura de señales pendientes bloqueadas durante las esperas epoll experimentales de Android: conservar la máscara del llamador y mantener la exclusión existente de epoll_pwait2. Las regresiones GCC/Clang compilan la función completa original y corregida; las nuevas compilaciones nativas y las mismas pruebas de dispositivos se registran por separado, conservando los fallos de los once parches y los límites del soporte oficial. Las suites sin cambios pasan dos veces en cinco entornos nativos de 4 KiB: 330/330 sondas y 80/80 pruebas Binder. Dos fallos de inicio de ART en API 28 se archivan por separado; el tercer intento con los mismos APK supera ambas rondas. La validación Samsung ARM64 del nuevo código está completa para estas suites fijas; el rebase de JSC se registra por separado
- `Corrección` Resultado histórico de once parches: Corregida la entrega anticipada de SIGSYS pendiente en spawn experimental de Android: el padre conserva la máscara del llamador, solo el hijo permite el manejo durante su preparación y se usa la ruta existente de incorporación al cgroup cuando SIGSYS está bloqueado. Las regresiones GCC/Clang cubren la función de producción completa y los fallos de control del código anterior; las pruebas del nuevo código se registran por separado de la aceptación histórica y del soporte oficial. La prueba posterior en dispositivos conserva la señal al volver de spawn, pero aún la entrega durante la espera asíncrona; la lectura independiente de registros y máscaras de epoll identifica el siguiente bloqueo, y la validación completa de 33 pruebas sigue fallando
- `Corrección` Permitir un nuevo intento bajo demanda tras 30 segundos cuando falla temporalmente la comprobación de disponibilidad, compartir las comprobaciones concurrentes y limitar cada flujo de salida a 4 KiB. Añadir diagnósticos de API, ABI, fase, identidad del runtime, salida y reintento conservando los resúmenes traducidos; identificar las señales inferidas sin cambiar los binarios nativos ni los límites de soporte
- `Corrección` Corrige el sondeo pidfd experimental de Android cuando el primer spawn asíncrono comienza con SIGSYS bloqueado, conservando la máscara del llamador y las señales pendientes mediante la alternativa waiter existente. El runtime de diez parches supera las 31 sondas sin cambios (310/310) y los ocho tests Binder completos (80/80) en cinco entornos nativos de 4 KiB. La evidencia de compilación recuperada declara los códigos de salida originales perdidos y archiva por separado el primer fallo de inicio ART. Rebase JSC y Release siguen pendientes para los nuevos binarios; los oficiales no cambian
- `Corrección` Corregir el aborto de inicio experimental de JavaScriptCore en x86_64 nativo de 16 KiB reconstruyendo WebKit fijado con configuración explícita de páginas grandes, JIT y asignadores y reenlazando Bun: dos rondas Binder pasan en AVD de 4 KiB y 16 KiB (32/32). Los binarios oficiales y su límite de 4 KiB no cambian; la aceptación Release es independiente
- `Mejora` Añadir cuatro modos TLS/IPv6 fijos sin conexión mediante el servicio Binder de producción: TLS 1.2/1.3, rechazo de certificado y nombre de host, HTTPS verificado e IPv6 TCP/UDP/HTTP. Vincular certificados públicos de prueba, fuentes exactas, APK y UID de ambos paquetes; conservar recuentos existentes y límites de publicación
- `Mejora` Añadir cuatro modos API fijos sin conexión mediante el servicio Binder de producción: archivos y vigilancia de directorios, DNS local por instancia, TCP binario con cierre parcial y HTTP con redirección/lectura de flujo/cancelación. Vincular fuentes exactas, APK y UID de ambos paquetes; conservar fallos, recuentos de las suites originales y límites de publicación
- `Mejora` Añadir un diagnóstico separado que conserva el orden original de siete modos de carga, la parada anticipada DFG y las aserciones. Registrar datos limitados por perfil antes de relanzar los errores y verificar las fuentes exactas y los UID de ambos paquetes, sin cambiar resultados históricos ni recuentos de compatibilidad
- `Mejora` Agregar un diagnóstico independiente y acotado de pilas completas y llamadores integrados con controles fijos del mapa PC. Conservar la carga intensiva y el umbral originales, verificar las opciones finales del profiler, guardar la primera pila completa por clase y las omisiones por límites de bytes, y comprobar por separado los llamadores y las decisiones del compilador sin ampliar la aceptación de compatibilidad
- `Mejora` Añadir una comparación acotada del mapeo de PC para el muestreo JSC: reutilizar la carga exacta de cuatro fases, verificar opciones finales y conservar decisiones de inlining, niveles reales de ejecución y salida 1. Invertir el orden en la segunda ronda sin cambiar pruebas originales, límites, binarios ni soporte
- `Mejora` Añadir diagnósticos JSC de cuatro fases para reinicio y borrado de datos, con un control explícito sin ejecución de la función objetivo y salida 1. Conservar testigos, marcas de tiempo y pruebas UID originales sin cambiar las pruebas anteriores ni afirmar que se reprodujo el fallo histórico
- `Mejora` Añadir un diagnóstico DFG independiente y acotado con tiempos por captura, llamadas, distribución de marcos y contadores de optimización. Conservar las salidas por muestras insuficientes y las pruebas exactas de código, APK y UID sin cambiar la prueba de presión original, los límites, el runtime ni los recuentos de compatibilidad
- `Mejora` Añadir una guía para liberar espacio de cachés de compilación y emuladores retirados, conservando la procedencia del runtime, los artefactos de prueba y los registros de fallos
- `Mejora` Bloqueo independiente del candidato JSC de páginas grandes con trece parches: dos compilaciones limpias nuevas de Bun conservan la salida real 0, binarios completos idénticos y 21 entradas sin cambios. Se reutilizan las bibliotecas JSC independientes e ICU; los nuevos APK y las regresiones Binder/siete modos de carga se vinculan por separado, sin transferir validaciones históricas ni ampliar el alcance de publicación
- `Mejora` Se añaden capturas SIGABRT acotadas de solo lectura a los diagnósticos watch/reload fijos, conservando señales y límites. Dieciséis observaciones con/sin rastreo en ARM64 nativo API 28/31 completan 32 recargas y capturan 24 SIGSYS ordinarias; paquetes y UID limpiados. El aborto original de API 28 no se reprodujo y sigue sin causa resuelta, sin añadir validaciones de compatibilidad
- `Mejora` Añadir una regresión fija de watch/reload en modos native/TRAP sin cambiar el runtime de doce parches ni las 33 pruebas originales. Cuatro dispositivos ARM 64 con páginas 4 KiB superan 264/264 pruebas originales, pero fallan 14/16 modos nuevos, con 28 fugas de descriptores en 32 recargas. El control nativo Sony 5.15 pasa y el TRAP forzado falla. Conservar tres lotes APK vinculados al código y las correcciones iniciales del validador, verificar la limpieza de paquetes y UID, y mantener pendientes la reparación nativa, la compatibilidad ampliada y Release
- `Mejora` Completar la regresión Samsung API 32 de doce parches en SM-F936U / ARM64 nativo / 4 KiB: las sondas originales pasan 66/66 y toda la suite Binder 16/16 en dos rondas. Se reutilizan los tres APK de la tanda API 36; pasan 40 puntos de control de señales pendientes y 12 observaciones de procesos hijos. Se eliminan los paquetes, se verifican tres UID sin procesos y se cierra el servidor ADB privado sin operar AVD. Ambas validaciones Samsung de estas suites fijas están completas; siete entornos de base suman 462/462 sondas y 112/112 Binder. La cobertura ampliada, la carga y Release siguen pendientes
- `Mejora` Validar el runtime de doce parches sin cambios en Samsung SM-A566B / API 36 / ARM64 nativo / páginas de hardware de 16 KiB: dos rondas superan las 33 sondas (66/66) y toda la suite Binder (16/16). Cuatro modos de señal pendiente conservan 40 puntos de control y 12 observaciones de procesos hijos antes de una entrega por llamador. Se reutilizan los mismos APK sin recompilar código nativo, se comprueban los tres UID tras desinstalar y se cierra el servidor ADB privado sin operar AVD. Seis entornos de base suman 396/396 sondas y 96/96 Binder; ARM64 API 32, la cobertura ampliada y Release siguen pendientes
- `Mejora` Verificar el candidato JSC de páginas grandes con doce parches en x86_64 nativo y API 36 con páginas de usuario de 4 KiB y 16 KiB: Binder sin cambios supera 32/32 pruebas y los modos fijos de carga 28/28 con un par de APK vinculado a 83 entradas. Conservar por separado la terminación inicial del servicio por falta de memoria; el reintento completo con los mismos APK pasa sin cambiar ajustes ni límites. Comprobar ambos UID tras la limpieza y separar la emulación x86, la base Samsung y los requisitos de publicación
- `Mejora` Vincular un candidato JSC de páginas grandes con doce parches a dos compilaciones nuevas e idénticas de Bun, con códigos de salida reales y 21 entradas de compilación sin cambios. Reutilizar las bibliotecas JSC independientes originales e ICU, conservar los candidatos históricos y dirigir Binder aislado al nuevo bloqueo de origen. La prueba de presión, su validador y sus límites no cambian; la aceptación en dispositivos y de Release sigue siendo independiente
- `Mejora` Añadir pruebas fijas de spawn con SIGSYS pendiente y trazado independiente. Los dos modos nuevos fallan dos veces en ARM64 nativo con API 28/31, mientras pasan los 31 casos originales; ocho trazas confirman la entrega anticipada de SI_TKILL. Archivar fallos, vínculos de fuentes/APK y limpieza sin cambiar los binarios nativos ni ampliar la compatibilidad declarada
- `Mejora` Localizar los resúmenes de errores en los diez idiomas, conservar los códigos estables y los detalles técnicos acotados, y generar ayuda de activación, requisitos de Android, tiempo de espera y límite de salida desde los mismos recursos Android. Traducir los rechazos de tamaño de página almacenados según el idioma actual y preservar caracteres Unicode completos al truncar diagnósticos
- `Mejora` Añadir una matriz generada de evidencias de compatibilidad con un índice completo de fuentes, hashes de archivos y comprobaciones de cambios en CI; conservar los resultados por runtime, dispositivo y conjunto, incluidos fallos y diagnósticos preliminares, sin nuevas validaciones de dispositivos ni ampliar el soporte oficial
- `Mejora` Verificar el nuevo candidato x86 de páginas grandes con diez parches en API 36, con páginas de usuario de 4 KiB y 16 KiB: Binder sin cambios pasa 32/32 y los modos de presión fijos 28/28 con el mismo par de APK vinculado a 77 entradas. Archivar bytes, resultados y limpieza por separado del historial; el ABI x86 de 16 KiB sigue emulado sobre páginas de núcleo de 4 KiB, sin aceptación de Release ni de rendimiento
- `Mejora` Vincular un candidato JSC de páginas grandes con diez parches por separado, exigiendo dos compilaciones limpias de Bun idénticas, códigos de salida reales conservados e inputs JSC reutilizados exactos. Las herramientas Binder aisladas usan el nuevo bloqueo vinculado al código; se conservan los binarios históricos y oficiales, y la validación de dispositivos y Release sigue separada
- `Mejora` Añadir una guía de diagnóstico en chino con un script mínimo, comprobaciones por síntoma, causa y acción, y pautas acotadas para informar de fallos; enlazarla desde los diez idiomas del README sin cambiar las capacidades del runtime
- `Mejora` Completa la regresión Samsung del runtime de diez parches sin cambios: ARM64 nativo API 32 / 4 KiB y API 36 / 16 KiB superan cada uno dos rondas de 31 sondas (62/62) y dos rondas completas de ocho tests Binder (16/16), con APK idénticos en ambos dispositivos. Siete entornos nativos suman 434/434 sondas y 112/112 Binder. Vincula las pruebas de fuente, APK y limpieza sin recompilar código nativo ni operar AVD; el rebase JSC, la matriz ampliada y Release siguen pendientes
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
- `Dependencia` Alinear el plugin en línea platform-versions con la versión 1.8.0 fijada por el repositorio, sin cambiar native-alignment
- `Dependencia` Eleva compileSdk a 37 para que el plugin pueda consumir el AAR compartido bun-runtime-api de la build 5280 del host AutoJs6, cuyos metadatos exigen el SDK de compilación 37; minSdk 33 y targetSdk 36 no cambian

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
