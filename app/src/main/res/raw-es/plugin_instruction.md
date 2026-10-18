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

- Los archivos del proyecto requieren un host que negocie archivos de espacio de trabajo: los scripts bajo project.json/package.json pueden usar importaciones relativas. De lo contrario se envía una sola instantánea de código. Nunca se instalan dependencias automáticamente (--no-install).
- No se inyectan globales de Rhino. Use el SDK explícito para las API documentadas de texto, imagen, captura, UI/Compose, WebView y automatización. Las API no enumeradas y los objetos Java arbitrarios no están admitidos.
- Sin puente Java: los scripts Bun no pueden acceder directamente a clases u objetos Java del proceso de AutoJs6.
- Sin promesa de toolchain completo de Bun: `bunx`, la generación de ejecutables en el dispositivo, la compilación C en runtime y los addons nativos arbitrarios quedan fuera del alcance admitido.
- No es un sandbox de seguridad: un script Bun se ejecuta como código de confianza en el proceso del plugin y puede usar los permisos concedidos al plugin, así que ejecuta solo scripts en los que confíes.

### Errores de ejecución y soluciones

Los mensajes usan el idioma de Android para el complemento. Los detalles de diagnóstico de bajo nivel y la salida de Bun pueden seguir en inglés.

- Si Bun Runtime no está activado o habilitado, abre el Centro de complementos en AutoJs6, autoriza y habilita el complemento y usa Activar si el anfitrión lo muestra.
- El complemento oficial requiere Android 13 (API 33) o posterior. No puede ejecutarse en Android 9 a 12L; reducir el requisito del manifiesto no hace compatible el entorno de ejecución.
- `TIMEOUT`: La ejecución de Bun agotó el tiempo de espera. Acorta la tarea o ajusta el tiempo de ejecución dentro del límite permitido.
- `OUTPUT_LIMIT`: La salida de Bun superó el límite de bytes configurado. Reduce la salida de stdout y stderr y ejecuta el script de nuevo.
- `RUNTIME_UNAVAILABLE`: Bun Runtime no está disponible. Comprueba la compatibilidad del dispositivo y reinstala el complemento si sus archivos están incompletos.

Consulta el [README del proyecto](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) para ver compatibilidad, permisos, selección de paquete y la lista completa de limitaciones actuales.
