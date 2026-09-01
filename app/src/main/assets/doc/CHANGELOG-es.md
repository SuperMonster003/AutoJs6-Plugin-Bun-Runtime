******

### Historial de versiones

******

# v0.2.0

###### 2026/09/01

* `Aviso` Android 13 (API 33) es ahora el objetivo mínimo oficial; API 28 a 32 siguen sin soporte hasta que un runtime Bun parcheado supere la validación portable
* `Mejora` Reducir el mínimo Android admitido de Android 14 (API 34) a Android 13 (API 33) conservando los payload Android oficiales y fijados de Bun 1.4.0
* `Mejora` Documentar el límite seccomp de AOSP T: Android 13 permite la syscall `close_range` directa de Bun, mientras el fallo en API 31 demuestra que API 28 a 32 requieren un parche de compatibilidad de Bun y no solo un cambio de manifest

# v0.1.0

###### 2026/09/01

* `Aviso` La primera versión ejecuta una instantánea y no expone globals de AutoJs6, un puente Java, proyectos con varios archivos ni importaciones relativas del proyecto
* `Función` Ejecutar JavaScript y TypeScript con el binario Android oficial de Bun 1.4.0 como motor `bun` independiente seleccionado por `"bun";`, usando `bun run --no-install <source>` sin instalar dependencias automáticamente
* `Función` Transmitir stdout y stderr solo como fragmentos limitados por callback oneway de Binder, mientras el resultado terminal informa del estado y los diagnósticos sin cargar los streams completos
* `Función` Admitir cancelación explícita, timeout predeterminado de 60 segundos, información del runtime y precalentamiento en el proceso aislado `:bun_runtime`
* `Función` Incluir binarios Android oficiales de 64 bits para `arm64-v8a` y baseline `x86_64`, además de paquetes de un solo ABI y `universal`
* `Función` Proporcionar descubrimiento, activación Wake protegida, metadatos PluginInfo completos y documentación de usuario en 10 idiomas
* `Mejora` Usar un contrato Binder versionado con transporte de código mediante ParcelFileDescriptor, límite de fuente de 16 MiB y límite de salida combinada de 8 MiB
* `Mejora` Iniciar Bun desde el directorio nativo de solo lectura de Android y verificar tamaños, SHA-256, tipo ELF, máquina y alineación de archivos oficiales y binarios empaquetados
* `Mejora` Verificar una alineación PT_LOAD de al menos 16 KB en ambos ejecutables y registrar expresamente que no se ha completado una prueba real en Android de 16 KB
* `Mejora` Generar README, instrucciones del centro de plugins y changelog integrado desde JSON validado, con comprobaciones CI de build, Markdown y artefactos runtime
* `Mejora` Exigir Android 14 (API 34) después de un `SIGSYS` app seccomp en API 31 por la syscall 436 `close_range` de Bun; un Sony API 33 pasó inesperadamente pero no es evidencia portable, mientras los recorridos Binder JS y TS en API 35 pasaron y versiones inferiores esperan un fallback upstream
