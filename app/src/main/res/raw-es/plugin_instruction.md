Este plugin permite a AutoJs6 ejecutar JavaScript y TypeScript con el motor oficial Bun 1.4.0: pon `"bun";` en la primera línea de un script y el archivo lo ejecutará Bun en un proceso aislado del plugin (el comando real es `bun run --no-install <source>`), con la salida y el resultado final transmitidos de vuelta a AutoJs6. Cada ejecución procesa una instantánea del archivo actual y nunca instala dependencias npm automáticamente.

### Instalación y uso

1. Prepara el entorno: instala AutoJs6 build 5278 (6.8.0) o posterior en Android 13 (API 33) o posterior.
2. Instala el plugin: descarga e instala el APK que corresponda al dispositivo desde [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). Elige `arm64-v8a` para la mayoría de teléfonos y tabletas, `x86_64` para emuladores o dispositivos x86_64, o `universal` si no estás seguro (algo más grande, funciona en ambos).
3. Activa el plugin: abre el centro de plugins de AutoJs6 y activa Bun Runtime. Si el plugin recién instalado aparece detenido, toca la acción `Activar` que muestra el host.
4. Ejecuta un script: pon `"bun";` solo en la primera línea de un archivo JavaScript o TypeScript (incluidas las comillas y el punto y coma) y ejecuta el archivo desde AutoJs6 como siempre.

### Inicio rápido

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

Si todo funciona, la primera línea de salida es `Bun 1.4.0` y la segunda es `android`.

### Limitaciones actuales

- Un archivo por ejecución: el plugin recibe y ejecuta una única instantánea de código fuente sin el directorio del proyecto, así que las importaciones relativas como `import './utils.js'` no pueden resolverse. La sintaxis ESM dentro del archivo único no se ve afectada; cuando se necesiten varios módulos, empaquétalos antes en un solo archivo en un ordenador (ver las preguntas frecuentes).
- Sin funciones integradas de AutoJs6: las API de automatización como `click()` y `toast()` y los globals de Rhino no existen dentro de los scripts Bun, así que estos scripts se adaptan por ahora a tareas que no dependen del host, como cálculo, procesamiento de texto y peticiones de red.
- Sin puente Java: los scripts Bun no pueden acceder directamente a clases u objetos Java del proceso de AutoJs6.
- Sin promesa de toolchain completo de Bun: `bunx`, la generación de ejecutables en el dispositivo, la compilación C en runtime y los addons nativos arbitrarios quedan fuera del alcance admitido.
- No es un sandbox de seguridad: un script Bun se ejecuta como código de confianza en el proceso del plugin y puede usar los permisos concedidos al plugin, así que ejecuta solo scripts en los que confíes.

Consulta el [README del proyecto](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) para ver compatibilidad, permisos, selección de paquete y la lista completa de limitaciones actuales.
