Ce plugin permet à AutoJs6 d'exécuter JavaScript et TypeScript avec le moteur officiel Bun 1.4.0: placez `"bun";` sur la première ligne d'un script, et le fichier est exécuté par Bun dans un processus isolé du plugin (la commande réelle est `bun run --no-install <source>`), la sortie et le résultat final étant retransmis à AutoJs6. Chaque exécution traite un instantané du fichier courant et n'installe jamais automatiquement de dépendances npm.

### Installation et utilisation

1. Préparez l'environnement: installez AutoJs6 build 5278 (6.8.0) ou ultérieur sur Android 13 (API 33) ou ultérieur.
2. Installez le plugin: téléchargez et installez l'APK correspondant à l'appareil depuis [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). Choisissez `arm64-v8a` pour la plupart des téléphones et tablettes, `x86_64` pour les émulateurs ou appareils x86_64, ou `universal` en cas de doute (un peu plus gros, fonctionne sur les deux).
3. Activez le plugin: ouvrez le centre de plugins AutoJs6 et activez Bun Runtime. Si le plugin fraîchement installé apparaît arrêté, touchez l'action `Activer` proposée par l'hôte.
4. Exécutez un script: placez `"bun";` seul sur la première ligne d'un fichier JavaScript ou TypeScript (guillemets et point-virgule compris), puis exécutez le fichier depuis AutoJs6 comme d'habitude.

### Démarrage rapide

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

Si tout fonctionne, la première ligne de sortie est `Bun 1.4.0` et la seconde est `android`.

### Limites actuelles

- Les fichiers du projet nécessitent un hôte négociant les archives de travail: les scripts sous project.json/package.json peuvent alors utiliser des imports relatifs. Sinon, seul un instantané source est transmis. Les dépendances ne sont jamais installées automatiquement (--no-install).
- Aucune variable globale Rhino: utilisez le client explicite pour Pinyin/Pinyin4j, les coordonnées, toast/informations appareil et les commandes de console autorisés. Les autres API d'automatisation et les objets Java directs ne sont pas disponibles. Le client explicite propose aussi les 32 noms de conversion OpenCC et le traitement courant des images. La lecture/écriture de fichiers image exige l'autorisation séparée image.files, désactivée par défaut. Le transfert des images encodées conserve les limites JSON de 64 KiB par requête et 256 KiB par résultat; utilisez les chemins de l'hôte pour les grandes images.
- Pas de pont Java: les scripts Bun ne peuvent pas accéder directement aux classes ou objets Java du processus AutoJs6.
- Pas de promesse de toolchain Bun complet: `bunx`, la production d'exécutables sur l'appareil, la compilation C au runtime et les addons natifs arbitraires restent hors périmètre.
- Pas un sandbox de sécurité: un script Bun s'exécute comme code de confiance dans le processus du plugin et peut utiliser les permissions accordées au plugin, donc n'exécutez que des scripts fiables.

### Erreurs d'exécution et dépannage

Les messages suivent le réglage de langue Android du plugin. Les détails du diagnostic de bas niveau et la sortie de Bun peuvent rester en anglais.

- Si Bun Runtime n'est pas activé, ouvrez le Centre de plugins dans AutoJs6, autorisez et activez le plugin, puis utilisez l'action Activer si l'hôte la propose.
- Le plugin officiel nécessite Android 13 (API 33) ou une version ultérieure. Il ne fonctionne pas sur Android 9 à 12L; abaisser l'exigence du manifeste ne rend pas le moteur compatible.
- `TIMEOUT`: Le délai d'exécution de Bun a expiré. Raccourcissez la tâche ou ajustez le délai dans la limite autorisée.
- `OUTPUT_LIMIT`: La sortie de Bun a dépassé la limite configurée en octets. Réduisez les sorties stdout et stderr, puis relancez le script.
- `RUNTIME_UNAVAILABLE`: Bun Runtime est indisponible. Vérifiez la compatibilité de l'appareil et réinstallez le plugin si ses fichiers sont incomplets.

Consultez le [README du projet](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) pour la compatibilité, les permissions, le choix du paquet et la liste complète des limites actuelles.
