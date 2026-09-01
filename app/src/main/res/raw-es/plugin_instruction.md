Bun Runtime es un plugin Android independiente que permite a AutoJs6 elegir [Bun](https://bun.sh/) como motor separado de JavaScript y TypeScript. El host envía una instantánea del código fuente mediante un descriptor de archivo, el plugin inicia el ejecutable Android oficial y fijado de Bun en su propio proceso de runtime, y la salida estándar, los errores, la finalización, el timeout y la cancelación vuelven mediante Binder. Es una ejecución real de Bun y no un alias de Rhino o Node.js.

Esta versión inicia el ejecutable Android oficial de Bun 1.4.0 en un proceso runtime aislado con `bun run --no-install <source>`. Recibe una instantánea JS o TS, nunca instala dependencias ausentes automáticamente y transmite stdout, stderr y el estado final a AutoJs6.

### Inicio rápido

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

La salida esperada empieza por `Bun 1.4.0` y después muestra `android`.

### Limitaciones de la versión 0.1

- Una sola instantánea: esta versión no implementa la transferencia de proyectos con varios archivos ni las importaciones relativas del proyecto.
- Sin globals de AutoJs6: los globals de Rhino, las API de automatización Android y los objetos del host no aparecen dentro de Bun.
- Sin puente Java: Bun no puede acceder directamente a clases u objetos Java del proceso AutoJs6.
- Sin promesa de toolchain completo: `bunx`, ejecutables producidos en el dispositivo, compilación C en runtime y addons nativos arbitrarios quedan fuera del alcance admitido.
- No es un sandbox de seguridad: un script Bun se ejecuta como código de confianza con el UID del plugin y puede usar los permisos concedidos al plugin.

Consulta el [README del proyecto](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) para ver compatibilidad, seguridad, selección de paquete y todas las limitaciones de la versión 0.1.
