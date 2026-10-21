<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>Exécute JavaScript et TypeScript avec le moteur Bun indépendant dans un processus Android isolé</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### Langues

******

Le fichier README.md actuel prend en charge les langues suivantes:

- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-en.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ar.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-es.md)
- Français [fr] # actuel
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ru.md)
- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### Introduction

******

Bun Runtime est un plugin autonome qui ajoute à AutoJs6 un moteur de scripts moderne optionnel: [Bun](https://bun.sh/). Une fois le plugin installé et activé, placer `"bun";` sur la première ligne d'un fichier JavaScript ou TypeScript confie ce fichier à un vrai moteur Bun 1.4.0 au lieu du moteur Rhino intégré, si bien que la syntaxe JavaScript moderne, TypeScript et les API intégrées de Bun comme `fetch` deviennent directement utilisables sur les appareils Android.

Le fonctionnement du plugin est simple: AutoJs6 envoie le contenu du script au plugin, le plugin démarre l'exécutable Android officiel de Bun dans son propre processus isolé, et la sortie ainsi que le résultat final reviennent en temps réel dans la console AutoJs6. C'est du vrai Bun, pas un alias ni une couche d'émulation au-dessus de Rhino ou Node.js. Sous Android 17 ou version ultérieure, autorisez les appareils à proximité avant de permettre ce plugin dans le centre de plugins AutoJs6. Cette autorisation se gère aussi dans les paramètres du plugin. Sans autorisation, le plugin reste désactivé et le démarrage automatique est ignoré sans message. Cette autorisation appartient au plugin et est indépendante de celle de AutoJs6.

******

### Installation et utilisation

******

1. Préparez l'environnement: installez AutoJs6 build 5278 (6.8.0) ou ultérieur sur Android 13 (API 33) ou ultérieur.
2. Installez le plugin: téléchargez et installez l'APK correspondant à l'appareil depuis [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). Choisissez `arm64-v8a` pour la plupart des téléphones et tablettes, `x86_64` pour les émulateurs ou appareils x86_64, ou `universal` en cas de doute (un peu plus gros, fonctionne sur les deux).
3. Activez le plugin: ouvrez le centre de plugins AutoJs6 et activez Bun Runtime. Si le plugin fraîchement installé apparaît arrêté, touchez l'action `Activer` proposée par l'hôte.
4. Exécutez un script: placez `"bun";` seul sur la première ligne d'un fichier JavaScript ou TypeScript (guillemets et point-virgule compris), puis exécutez le fichier depuis AutoJs6 comme d'habitude.

> Les fichiers du projet nécessitent un hôte négociant les archives de travail: les scripts sous project.json/package.json peuvent alors utiliser des imports relatifs. Sinon, seul un instantané source est transmis. Les dépendances ne sont jamais installées automatiquement (--no-install).

******

### Démarrage rapide

******

Enregistrez le contenu suivant comme fichier de script et exécutez-le pour confirmer que le moteur Bun a pris en charge l'exécution:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

Si tout fonctionne, la première ligne de sortie est `Bun 1.4.0` et la seconde est `android`.

Les fichiers TypeScript s'exécutent aussi directement, sans compilation préalable ni configuration supplémentaire:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

D'autres exemples commentés, prêts à copier et à exécuter, sont disponibles dans [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples): requêtes réseau, fichiers de l'espace de travail privé, stdout/stderr et types TypeScript. Tous respectent les limites actuelles d'une source unique et de `--no-install`.

******

### Fonctionnalités

******

- Un vrai moteur Bun: les scripts sont exécutés directement par l'exécutable Android officiel de Bun 1.4.0, sans transpilation et sans transfert vers d'autres moteurs AutoJs6.
- TypeScript prêt à l'emploi: les fichiers TS s'exécutent directement sans étape de compilation ni configuration supplémentaire, et la syntaxe JavaScript moderne, la syntaxe ESM dans un fichier unique et les API Bun disponibles dans le build Android épinglé fonctionnent toutes.
- Exécution transparente: la sortie comme `console.log` revient en temps réel dans la console AutoJs6, et le résultat final indique le statut de sortie, la durée et si l'exécution a expiré ou a été annulée.
- Stable et contrôlable: chaque script s'exécute dans un processus isolé du plugin, peut être annulé à tout moment et est terminé automatiquement en cas de timeout, si bien qu'un script défaillant n'entraîne jamais AutoJs6 avec lui.
- Provenance vérifiable du moteur: l'exécutable Bun embarqué correspond octet par octet à la version officielle, et son tag, commit, taille, SHA-256 et propriétés ELF sont vérifiés au build et en CI.
- Livraison entièrement localisée: métadonnées du plugin, instructions du centre de plugins, README et changelog couvrent 10 langues, tous générés depuis un même jeu de sources validé.
- Conversions OpenCC et API courantes d'image via le client hôte, avec lecture des pixels, encodage, transformations, recherche de couleurs et libération des images par exécution; accès aux fichiers de l'hôte soumis à une autorisation séparée désactivée par défaut.
- Bun propose la capture écran avec autorisation distincte, consentement Android, nettoyage après expiration/annulation et nouvelle demande.
- Bun screenRecorder produit des MP4 H.264 avec audio AAC du microphone, des applications ou mixé et captures pendant la vidéo, avec autorisations audio distinctes et nettoyage après annulation.
- API Bun pour accessibilité, applications et presse-papiers alignées sur Node.js, avec autorisations distinctes et applications empaquetées.
- API Bun de fichiers et de stockage persistant, avec autorisations distinctes et stockage partagé avec Node.js.
- API hôtes database/sqlite pour Bun et les Workers Node.js, avec requêtes paramétrées, transactions et persistance.
- Mesures et abonnements aux capteurs pour Bun et les Workers Node.js, avec annulation et libération automatique des écouteurs.
- Shell hôte avec flux, autorisation Shizuku et nettoyage des processus pour Bun, Node.js et les Workers.

******

### Limites actuelles

******

- Les fichiers du projet nécessitent un hôte négociant les archives de travail: les scripts sous project.json/package.json peuvent alors utiliser des imports relatifs. Sinon, seul un instantané source est transmis. Les dépendances ne sont jamais installées automatiquement (--no-install).
- Les variables globales Rhino ne sont pas injectées. Utilisez le SDK explicite pour les API documentées de texte, image, capture, UI/Compose, WebView et automatisation. Les API non répertoriées et les objets Java arbitraires ne sont pas pris en charge.
- Pas de pont Java: les scripts Bun ne peuvent pas accéder directement aux classes ou objets Java du processus AutoJs6.
- Pas de promesse de toolchain Bun complet: `bunx`, la production d'exécutables sur l'appareil, la compilation C au runtime et les addons natifs arbitraires restent hors périmètre.
- Pas un sandbox de sécurité: un script Bun s'exécute comme code de confiance dans le processus du plugin et peut utiliser les permissions accordées au plugin, donc n'exécutez que des scripts fiables.

******

### FAQ

******

#### Pourquoi les fonctions AutoJs6 comme `click()` et `toast()` sont-elles indisponibles dans les scripts Bun?

Importez `process.env.AUTOJS6_HOST_CLIENT_MODULE` et attendez `createHostClient()`. Le build hôte 5572 avec Bun Runtime 0.3.0 fournit `host.app`, `host.accessibility` et `host.clipboard`. Activez leurs autorisations distinctes dans le centre de plugins; les gestes exigent aussi `accessibility.gesture`. Les projets empaquetés déclarent les mêmes autorisations. Les règles Android sur le service accessibilité et le presse-papiers au premier plan restent applicables. Voir [Host API](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/host-api.md). API Bun de fichiers et de stockage persistant, avec autorisations distinctes et stockage partagé avec Node.js. (`host.files`, `host.storage`, `host.storages`; `files.control`, `storage.control`.)

#### Puis-je utiliser des paquets npm?

Pas en les installant sur l'appareil. Le plugin s'exécute toujours avec `--no-install` et ne télécharge jamais de dépendances. Si une bibliothèque tierce est vraiment nécessaire, regroupez d'abord le script et ses dépendances JS pures en un seul fichier sur un ordinateur, par exemple avec `bun build`, puis exécutez ce fichier sur l'appareil; les paquets reposant sur des addons natifs ne peuvent pas être utilisés ainsi.

#### Un script peut-il faire un `import` d'autres fichiers du projet?

Les fichiers du projet nécessitent un hôte négociant les archives de travail: les scripts sous project.json/package.json peuvent alors utiliser des imports relatifs. Sinon, seul un instantané source est transmis. Les dépendances ne sont jamais installées automatiquement (--no-install).

#### Pourquoi Android 13 est-il le minimum?

Bun invoque l'appel système Linux `close_range` (syscall 436), que la liste d'autorisation seccomp des applications sur Android 12L et antérieurs n'inclut pas, si bien que le processus Bun est tué par `SIGSYS` (reproduit sur un appareil réel API 31). Android 13 autorise cet appel, et les tests sur appareils réels API 33 et API 35 ont réussi. Prendre en charge des versions plus anciennes nécessite de patcher Bun; voir la feuille de route pour l'avancement.

#### Que se passe-t-il quand un script expire ou imprime trop?

Une exécution est limitée à 60 seconds par défaut; en cas de timeout, le processus Bun est terminé et le résultat est marqué comme expiré. Quand la sortie combinée stdout et stderr dépasse 8 MiB, l'exécution se termine par une erreur de limite de sortie au lieu d'être tronquée silencieusement. Dans les deux cas, découpez la tâche ou réduisez la quantité de sortie.

#### Les appareils à pages de 16 KB sont-ils pris en charge?

16 KB: les contrôles d'alignement ELF et APK passent. Sur Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), l'APK de développement v0.2.1 arm64 uniquement avec Bun officiel a réussi les 8 tests Binder deux fois sans traduction. Le résultat ARM64 précédent sur AVD x86_64 reste limité à la traduction; x86_64 natif s'interrompt avec le code 134 même sur un script minimal. Cette preuve concerne ce développement et cet appareil, pas un APK de Release publié ni une prise en charge générale de 16 KB.

#### Quel APK dois-je installer?

La plupart des téléphones et tablettes utilisent `arm64-v8a`. Utilisez `x86_64` baseline pour les émulateurs ou appareils x86_64. En cas de doute, installez `universal`, qui contient les deux ABI; un peu plus gros, mais le choix le plus sûr.

#### Où trouver de l'aide pour les problèmes d'installation et d'exécution?

Consultez le [guide de dépannage (en chinois)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/troubleshooting.md) pour un script minimal, les vérifications d'activation, Android, ABI, taille de page, délai, sortie et imports, ainsi que les informations à joindre à un rapport de problème.

******

### Compatibilité

******

- Moteur: Bun officiel 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Système: Android 13 (API 33) ou ultérieur, avec des exécutables officiels 64 bits pour `arm64-v8a` et `x86_64` baseline. Android 9 à 12L (API 28 à 32) ne sont pas encore pris en charge; la FAQ ci-dessus en explique la raison. Les tests sur appareils réels API 33 et API 35 ont réussi.
- Hôte: AutoJs6 build 5278 ou ultérieur, avec le contrat Bun runtime version 1.
- Bornes par exécution: source jusqu'à 16 MiB, sortie combinée stdout et stderr jusqu'à 8 MiB et timeout par défaut de 60 seconds.
- Paquets: les APK mono-ABI gardent l'installation plus légère, tandis que l'APK `universal`, plus gros, contient les deux ABI pris en charge.
- Preuves de test: la [matrice de compatibilité générée (en chinois)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/compatibility/MATRIX.md) répertorie les appareils, niveaux API, ABI, tailles de page et résultats de chaque suite enregistrée. Les exécutions officielles, expérimentales, traduites et échouées gardent leur propre portée; ces rapports ne modifient pas la prise en charge publiée.

******

### Permissions et intégrité

******

- Un superviseur distinct, verrouillé et en lecture seule gère les délais, annulations et limites de sortie, même si le script ignore SIGTERM. Il récupère le processus Bun direct; ce n'est ni un bac à sable ni un gestionnaire de tous les descendants détachés.
- Les composants exportés d'activation (Wake), info et runtime sont protégés par `org.autojs.permission.PLUGIN`, et AutoJs6 effectue toujours ses contrôles habituels d'autorisation des plugins.
- L'instantané du script est placé dans un répertoire privé propre à chaque exécution, et l'exécutable Bun démarre depuis le répertoire de bibliothèques natives Android en lecture seule au lieu d'être copié vers un stockage inscriptible.
- Le lock du dépôt consigne à la fois les archives officielles et les binaires empaquetés dans l'APK; la CI refuse toute dérive de taille, SHA-256 ou propriétés ELF avant le build.
- Le plugin déclare l'accès Internet car des scripts Bun de confiance peuvent utiliser des API réseau comme `fetch`. Le plugin n'est pas un sandbox; n'exécutez que des scripts fiables.

******

### Erreurs d'exécution et dépannage

******

Les messages suivent le réglage de langue Android du plugin. Les détails du diagnostic de bas niveau et la sortie de Bun peuvent rester en anglais.

- Si Bun Runtime n'est pas activé, ouvrez le Centre de plugins dans AutoJs6, autorisez et activez le plugin, puis utilisez l'action Activer si l'hôte la propose.
- Le plugin officiel nécessite Android 13 (API 33) ou une version ultérieure. Il ne fonctionne pas sur Android 9 à 12L; abaisser l'exigence du manifeste ne rend pas le moteur compatible.
- `TIMEOUT`: Le délai d'exécution de Bun a expiré. Raccourcissez la tâche ou ajustez le délai dans la limite autorisée.
- `OUTPUT_LIMIT`: La sortie de Bun a dépassé la limite configurée en octets. Réduisez les sorties stdout et stderr, puis relancez le script.
- `RUNTIME_UNAVAILABLE`: Bun Runtime est indisponible. Vérifiez la compatibilité de l'appareil et réinstallez le plugin si ses fichiers sont incomplets.

******

### Interface du plugin

******

Cette section s'adresse aux développeurs de l'hôte AutoJs6 et de plugins; les utilisateurs ordinaires peuvent la passer. Les identifiants et limites stables sont:

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

`BunRuntimeService` est découvert par l'action `org.autojs.plugin.bun.RUNTIME` et la catégorie `bun`. Il reçoit la source via `ParcelFileDescriptor` et un ID d'exécution dans la requête, puis lance `bun run --no-install <source>` tant que l'appel synchrone `runScript` reste actif. Stdout et stderr sont envoyés uniquement sous forme de fragments bornés par le callback oneway. Le Bundle terminal renvoyé et l'événement `finished` contiennent des champs de statut et un résumé diagnostic, jamais les streams complets, afin de garder chaque transaction Binder sous sa limite. Le service prend en charge l'annulation explicite et le préchauffage et tourne dans `:bun_runtime`.

16 KB: les contrôles d'alignement ELF et APK passent. Sur Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), l'APK de développement v0.2.1 arm64 uniquement avec Bun officiel a réussi les 8 tests Binder deux fois sans traduction. Le résultat ARM64 précédent sur AVD x86_64 reste limité à la traduction; x86_64 natif s'interrompt avec le code 134 même sur un script minimal. Cette preuve concerne ce développement et cet appareil, pas un APK de Release publié ni une prise en charge générale de 16 KB.

******

### Feuille de route

******

La feuille de route répond à deux questions: ce qui fonctionne maintenant et ce qui vient ensuite. Les éléments cochés décrivent le comportement réel de la version actuelle; les éléments non cochés (projets multifichiers, pont de capacités AutoJs6, prise en charge élargie des versions Android, mises à niveau de Bun, etc.) sont des plans, pas des promesses de prise en charge actuelle.

- [Voir ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Historique des versions

******

#### v0.16.0

_2026/10/21_

- `Fonctionnalité` Bun mail.control: Connexions aux comptes mail, messages, pièces jointes et surveillance des boîtes, avec annulation et nettoyage des Workers
- `Correctif` Valeurs tts.control, speech.control et epub.control manquantes dans le type des capacités Bun

#### v0.15.0

_2026/10/21_

- `Fonctionnalité` Bun: Lecture EPUB, export des ressources, recherche et sessions du lecteur avec événements

#### v0.14.0

_2026/10/20_

- `Fonctionnalité` API speech de reconnaissance vocale et de gestion des modèles pour Node.js, Bun et Workers avec WAV/PCM, dictée et activation vocale, installation/importation, synthèse et annulation

##### Pour plus d'historique

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-fr.md)

******

### Build et vérification

******

Git LFS doit matérialiser les deux binaires épinglés avant la vérification ou le packaging Gradle. Les contrôles locaux standard sont indiqués ci-dessous. JDK 17 ou ultérieur, Node.js et Android SDK 36 sont requis.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### Localisation et génération des documents

******

Modifiez les JSON et les templates Markdown, puis exécutez `py .python/generate_markdown.py`. Ne modifiez pas à la main les README, changelog ou instructions générés. `--check` valide sans écriture la structure des langues, la version, les ressources, les artefacts orphelins et la dérive des fichiers générés.

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

### Licence

******

Le code du plugin est sous [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). L'exécutable officiel de Bun contient le code Bun sous MIT, JavaScriptCore et WebKit liés statiquement sous LGPL-2, ainsi que d'autres composants sous leurs propres licences. Les Releases concernés publient un avis public de licence/relinking et les assets de sources correspondantes séparément des APK dans le même Release, avec un manifest lisible par machine et SHA256SUMS contrôlés par des vérifications techniques automatisées. Consultez [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) et le [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) épinglé de Bun.

******

### Liens

******

- Projet AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Site officiel de Bun: https://bun.sh/
- Version Bun épinglée: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- Mentions de tiers: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
