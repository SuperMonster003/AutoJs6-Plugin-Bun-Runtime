******

### Historial de versiones

******

# v0.2.1

###### 2026/09/10

* `Aviso` Versión de desarrollo aún no publicada; el plugin oficial sigue requiriendo Android 13 (API 33) o posterior
* `Corrección` Corregir la limpieza por tiempo agotado, cancelación y límite de salida del complemento oficial con un supervisor fijado de solo lectura: escalar SIGTERM ignorado a SIGKILL, esperar la salida del proceso Bun directo y conservar la salida pendiente; Bun 1.4.0 y el mínimo Android 13 no cambian
* `Corrección` Corregir la terminación de la sonda aislada de Bun modificado compilando el contenedor compartido SupervisedProcess e incluyendo el supervisor fijado; vincular fuentes, herramientas y supervisor en recibos de esquema 2 y mantener abiertos los lectores de salida hasta la terminación
* `Mejora` Añadir cinco pruebas FD/SIGSYS: cuatro dispositivos arm64 nativos (API 28/31/33/35) y un AVD x86_64 nativo con API 33 obtienen 17/18 en dos rondas cada uno. Pasan el aislamiento de descriptores al crear procesos y las pruebas de señales, pero las 10 rondas revelan la falta de una alternativa CLOEXEC al iniciar; conservar este bloqueo sin cambiar los bytes oficiales ni el mínimo Android 13
* `Mejora` Vincular el código del supervisor, las instrucciones con NDK fijo y sus hashes por ABI en el esquema 2 de corresponding-source, verificando los archivos exactos del paquete fuente sin modificar los recursos de v0.2.0
* `Mejora` Añadir herramientas para compilar un APK aislado solo de prueba y ejecutarlo en un dispositivo explícito con Bun modificado reproducible, verificaciones exactas de fuentes/APK/runtime, firma temporal y reportes acotados legibles por máquina
* `Mejora` Superar las 13 pruebas de proceso de aplicación dos veces en dispositivos arm64 nativos con API 28, 31, 33 y 35: 24 casos que ignoran SIGTERM por tiempo agotado, límite de salida o cancelación tras estar listos confirman la salida del hijo y del supervisor y la limpieza del directorio; conservar el informe original 10/12 sin afirmar compatibilidad Binder experimental completa ni ampliar el soporte Android
* `Mejora` Archivar la verificación de APK y fuentes publicados con v0.2.0 y la aceptación de paquetes firmados en dispositivos, sin reescribir la etiqueta publicada ni ampliar la compatibilidad con Android o páginas de 16 KB
* `Dependencia` Actualizar el plugin de compilación en línea autojs6-platform-versions de 1.7.3 a 1.7.4 y sincronizar el requisito de versión del repositorio

# v0.2.0

###### 2026/09/08

* `Aviso` Esta versión reduce el requisito mínimo de sistema de Android 14 a Android 13 (API 33); Android 9 a 12L (API 28 a 32) sigue sin soporte hasta que un runtime de Bun parcheado supere la validación de portabilidad
* `Corrección` Reforzar la verificación de los recursos de Release: comprobar el tamaño y SHA-256 del archivo de WebKit frente al registro fijado y admitir los distintos formatos de salida de apksigner
* `Corrección` Identificar el ABI del runtime instalado mediante el SHA-256 del payload fijado, en vez del orden de iteración de la tabla ABI, y hacer que el precalentamiento ejecute una prueba mínima de JavaScript para rechazar un runtime inutilizable antes de iniciar scripts de usuario
* `Corrección` Rechazar el runtime oficial x86_64 incompatible antes de iniciar el proceso cuando Android usa páginas mayores de 4 KiB, tras aislar el fallo en el límite de 4 KiB de JavaScriptCore fijado, sustituyendo un aborto determinista de Bun por un diagnóstico acotado
* `Mejora` Reducir el requisito mínimo de sistema: se conserva el payload Android oficial y fijado de Bun 1.4.0 y se relaja el límite inferior de soporte de Android 14 (API 34) a Android 13 (API 33), cubriendo más dispositivos
* `Mejora` Identificar la causa raíz de los fallos en versiones antiguas: desde Android 13 el seccomp del sistema permite la syscall raw `close_range` que Bun invoca, mientras que un fallo en dispositivo real con API 31 demuestra que API 28 a 32 requieren parchear el propio Bun y no basta con cambiar el manifest
* `Mejora` Preparar el futuro soporte de Android 9+: se establece un plan de parches del código fuente de Bun reproducible con exactitud (6 parches) y se fijan las entradas de build (NDK y contenedor fijados, 22 dependencias activas de Android release); esto establece una línea experimental separada y no modifica el runtime oficial incluido en los paquetes actuales
* `Mejora` Reforzar los controles de calidad del paquete: cada APK de Debug y Release verifica el ZIP alignment de 16 KB, el contenido ABI exacto y el tamaño y SHA-256 del payload fijado de Bun, y los bytes del payload instalado se cotejan en un dispositivo de prueba con Android 13
* `Mejora` Endurecer la cadena de suministro: se fijan los bytes exactos de 19 archivos fuente de Bun y 17 descargas de toolchain, se inventarían 181 entradas de integridad de Cargo y 172 del registro de Bun, y se añaden un materializer que rechaza sobrescrituras y una precomprobación de build de doble ABI protegida por la puerta `buildReady`
* `Mejora` Ampliar la biblioteca de ejemplos listos para copiar y ejecutar con casos comentados de fetch de red, archivos del espacio de trabajo privado, streaming de stdout/stderr y tipos de TypeScript más completos; añadir una puerta de documentación que exige la directiva `"bun";` en la primera línea y los límites de una sola fuente y sin instalación
* `Mejora` Validar la ejecución con 16 KB en un AVD Android 16 (API 36) forzando PAGE_SIZE=16384: el APK de ABI única `arm64-v8a` supera las 5 pruebas de instrumentación Binder mediante `libndk_translation`, mientras que el payload `x86_64` nativo aborta con código de salida 134 incluso con un script mínimo; por ello no se afirma soporte general de 16 KB
* `Mejora` Cerrar la parte de Cargo de la cadena de suministro experimental para Android 9+: bloquear y materializar los 181 archivos de crates.io (26,354,160 bytes), generar un directory source verificado con checksums y demostrar que el Cargo fijado carga todo el workspace de Bun con `--locked --offline` y un `CARGO_HOME` vacío; este resultado cubre solo las entradas de Cargo y no cierra por sí solo las demás entradas de build
* `Mejora` Cerrar la parte del registro de Bun de esa cadena: resolver 172 referencias del lock en 125 archivos npm únicos para Linux x64 (31,498,870 bytes), reconstruir una cache mínima desde los tarballs bloqueados y superar las tres instalaciones frozen en el contenedor Ubuntu fijado, sin red y con la cache de solo lectura; `esbuild@0.21.5` es la única dependencia con postinstall de confianza
* `Mejora` Completar la puerta de compilación reproducible del runtime parcheado sin distribuirlo: bloquear 155 archivos `.deb` del host (422,223,096 bytes) en una imagen OCI reproducible, ampliar el cierre de Cargo a 206 archivos únicos, ejecutar dos compilaciones limpias y sin red de ambos ABI de 64 bits con resultados idénticos byte a byte, y fijar auditorías ELF en Node puro; pasan las pruebas directas de shell en API 28 y 31, mientras siguen pendientes las puertas de APK y proceso de aplicación
* `Mejora` Implementar assets de Release verificables del código fuente correspondiente: mantener el código separado de los APK en el mismo Release; empaquetar Bun/WebKit/JSC exactos, 19 archivos native, 206 de Cargo y 125 de npm, además de patches, instrucciones de build/relink y un aviso público de licencias; dividir archivos grandes a 1.9 GB, vincular bytes de APK/runtime/source mediante un manifest legible por máquina y SHA256SUMS, y publicar el draft solo tras coincidir todos los SHA-256 de GitHub; esto registra verificación técnica automatizada, no aprobación legal
* `Dependencia` Añadir el runtime de Kotlin Parcelize para que R8 en Release conserve la clase compartida del contrato Parcelable

# v0.1.0

###### 2026/09/01

* `Aviso` Primera versión: cada ejecución procesa un único archivo de script independiente; las funciones integradas de AutoJs6, el puente Java, los proyectos multiarchivo y las importaciones relativas aún no están disponibles
* `Función` Añadir el motor `bun` independiente: escribe `"bun";` en la primera línea de un script para ejecutar JavaScript y TypeScript con el ejecutable Android oficial de Bun 1.4.0; el comando real es `bun run --no-install <source>` y las dependencias nunca se instalan automáticamente
* `Función` Devolver la salida en tiempo real: stdout y stderr se transmiten en fragmentos acotados mediante oneway Binder callback, y el resultado final solo informa estado y diagnóstico sin llevar el flujo de salida completo
* `Función` Ejecución controlable: los scripts se ejecutan en el proceso aislado del plugin `:bun_runtime`, con cancelación explícita, timeout predeterminado de 60 segundos, consulta de información del runtime y prewarming
* `Función` Proporcionar payloads Android oficiales de 64 bits para `arm64-v8a` y baseline `x86_64`, además de paquetes de un solo ABI y `universal`
* `Función` Ofrecer la experiencia completa de plugin: descubrimiento del plugin, activación protegida por permiso (Wake), metadatos PluginInfo completos y documentación de usuario en 10 idiomas
* `Mejora` Adoptar un contrato Binder versionado que transfiere el código fuente por ParcelFileDescriptor, con límite de 16 MiB para el código y de 8 MiB para la salida combinada
* `Mejora` Iniciar Bun desde el directorio read-only de native library de Android y verificar tamaño, SHA-256 y propiedades ELF de los archivos release fijados y los binarios empaquetados
* `Mejora` Verificar que ambos ejecutables empaquetados tienen PT_LOAD alignment de al menos 16 KB, documentando con honestidad que la prueba en un entorno Android real de 16 KB aún no se ha completado
* `Mejora` Generar el README, las instrucciones del centro de plugins y el changelog integrado desde fuentes JSON validadas, con comprobaciones de CI para build, Markdown y artefactos de runtime
* `Mejora` Fijar el mínimo provisional en Android 14 (API 34): en un dispositivo real con API 31 la syscall `close_range` de Bun es terminada por seccomp con `SIGSYS`, un dispositivo Sony con API 33 pasó inesperadamente pero no demuestra portabilidad, y las pruebas de ida y vuelta por Binder con JS y TS pasaron en un dispositivo real con API 35
