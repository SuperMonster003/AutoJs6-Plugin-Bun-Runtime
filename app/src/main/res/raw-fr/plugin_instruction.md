Bun Runtime est un plugin Android autonome qui permet à AutoJs6 de choisir [Bun](https://bun.sh/) comme moteur JavaScript et TypeScript distinct. L'hôte envoie un instantané de source par un descripteur de fichier, le plugin démarre l'exécutable Android officiel et épinglé de Bun dans son propre processus runtime, puis stdout, stderr, la fin, le timeout et l'annulation reviennent par Binder. Il s'agit d'une véritable exécution Bun, et non d'un alias de Rhino ou Node.js.

Cette version lance l'exécutable Android officiel de Bun 1.4.0 dans un processus runtime isolé avec `bun run --no-install <source>`. Elle reçoit un instantané JS ou TS, n'installe jamais automatiquement les dépendances absentes et retransmet stdout, stderr et l'état final à AutoJs6.

### Démarrage rapide

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

La sortie attendue commence par `Bun 1.4.0`, puis affiche `android`.

### Limites de la version 0.1

- Un seul instantané: le transfert de projets multifichiers et les imports relatifs au projet ne sont pas implémentés dans cette version.
- Pas de globals AutoJs6: les globals Rhino, les API d'automatisation Android et les objets de l'hôte n'apparaissent pas dans Bun.
- Pas de pont Java: Bun ne peut pas accéder directement aux classes ou objets Java du processus AutoJs6.
- Pas de promesse de toolchain complet: `bunx`, les exécutables produits sur l'appareil, la compilation C au runtime et les addons natifs arbitraires sont hors périmètre.
- Pas un sandbox de sécurité: un script Bun s'exécute comme code de confiance sous l'UID du plugin et peut utiliser les permissions accordées au plugin.

Consultez le [README du projet](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) pour la compatibilité, la sécurité, le choix du paquet et toutes les limites de la version 0.1.
