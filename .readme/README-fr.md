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

Bun Runtime est un plugin Android autonome qui permet à AutoJs6 de choisir [Bun](https://bun.sh/) comme moteur JavaScript et TypeScript distinct. L'hôte envoie un instantané de source par un descripteur de fichier, le plugin démarre l'exécutable Android officiel et épinglé de Bun dans son propre processus runtime, puis stdout, stderr, la fin, le timeout et l'annulation reviennent par Binder. Il s'agit d'une véritable exécution Bun, et non d'un alias de Rhino ou Node.js.

******

### Fonctionnalités

******

- Moteur indépendant: exécute le binaire Android officiel de Bun 1.4.0 au lieu de transmettre le code à un autre moteur AutoJs6.
- JavaScript et TypeScript: Bun analyse et exécute un unique instantané JS ou TS, avec la syntaxe ESM et les API Bun disponibles dans le build Android épinglé.
- Exécution observable: stdout et stderr sont transmis à l'hôte, tandis que le résultat final indique le statut, la durée, le timeout, l'annulation et des diagnostics bornés.
- Runtime contrôlé: les binaires `arm64-v8a` et `x86_64` sont épinglés par tag, commit, taille, SHA-256, machine ELF et alignement PT_LOAD minimal.
- Livraison localisée: métadonnées, instructions du centre de plugins, README et changelog couvrent 10 langues depuis un même jeu validé.

******

### Installation et utilisation

******

1. Utilisez AutoJs6 build 5278 (6.8.0) ou ultérieur sur Android 13 (API 33) ou ultérieur.
2. Installez l'APK correspondant à l'ABI de l'appareil. Choisissez `arm64-v8a` pour la plupart des téléphones et tablettes, `x86_64` pour un émulateur ou appareil compatible, ou `universal` en cas de doute.
3. Ouvrez le centre de plugins AutoJs6 et activez Bun Runtime. Si le plugin nouvellement installé reste arrêté, utilisez l'action `Activer` proposée par l'hôte.
4. Placez la directive autonome `"bun";` au début d'un fichier JavaScript ou TypeScript, puis exécutez-le normalement depuis AutoJs6.

> La version 0.1 exécute un instantané immuable par requête avec `bun run --no-install <source>` et n'installe donc jamais automatiquement les dépendances absentes. Consultez les limites avant de migrer un projet Rhino ou Node.js existant vers Bun.

******

### Démarrage rapide

******

Exécutez ce fichier pour confirmer que l'hôte a sélectionné Bun et que le runtime Android a démarré:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

La sortie attendue commence par `Bun 1.4.0`, puis affiche `android`.

Bun traite TypeScript directement, sans compilation TypeScript côté hôte:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### Compatibilité

******

- Runtime: Bun officiel 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Plateforme: Android 13 (API 33) ou ultérieur, avec des binaires officiels 64 bits pour `arm64-v8a` et `x86_64` baseline. Un appareil réel API 31 a échoué avec `SIGSYS` app seccomp sur la syscall 436 `close_range` de Bun. Les listes d'autorisation AOSP Android 12 et antérieures n'incluent pas cette syscall, tandis qu'Android 13 (T, API 33) autorise la syscall brute. Android 14 ajoute le wrapper bionic public, mais Bun appelle la syscall brute et n'a pas besoin de ce symbole libc d'API 34. Les tests réels du runtime sur API 33 et API 35 ont réussi. API 28 à 32 restent non prises en charge jusqu'à ce qu'un runtime Bun corrigé gère les traps seccomp et réussisse la validation portable.
- Contrat hôte: AutoJs6 build 5278 ou ultérieur et contrat Bun runtime version 1.
- Bornes: source jusqu'à 16 MiB, budget de streaming combiné stdout et stderr jusqu'à 8 MiB et timeout par défaut de 60 seconds.
- Paquets: les APK mono-ABI sont plus petits, tandis que l'APK `universal` contient les deux ABI pris en charge.

******

### Limites de la version 0.1

******

- Un seul instantané: le transfert de projets multifichiers et les imports relatifs au projet ne sont pas implémentés dans cette version.
- Pas de globals AutoJs6: les globals Rhino, les API d'automatisation Android et les objets de l'hôte n'apparaissent pas dans Bun.
- Pas de pont Java: Bun ne peut pas accéder directement aux classes ou objets Java du processus AutoJs6.
- Pas de promesse de toolchain complet: `bunx`, les exécutables produits sur l'appareil, la compilation C au runtime et les addons natifs arbitraires sont hors périmètre.
- Pas un sandbox de sécurité: un script Bun s'exécute comme code de confiance sous l'UID du plugin et peut utiliser les permissions accordées au plugin.

******

### Permissions et intégrité

******

- Les composants Wake, info et runtime exportés sont protégés par `org.autojs.permission.PLUGIN`; AutoJs6 conserve ses contrôles habituels d'autorisation des plugins.
- L'instantané est placé dans un répertoire privé propre à chaque exécution. L'exécutable démarre depuis le répertoire natif Android en lecture seule et n'est pas copié vers un stockage inscriptible.
- Le lock du dépôt consigne les archives officielles et les binaires empaquetés. La CI refuse toute dérive de taille, SHA-256, type ELF, machine ou alignement avant le build.
- Le plugin déclare l'accès Internet car des scripts Bun de confiance peuvent utiliser des API réseau comme `fetch`. Le plugin n'est pas un sandbox, alors exécutez uniquement des scripts fiables.

******

### FAQ

******

#### Pourquoi les globals AutoJs6 manquent-ils dans Bun?

Bun est un processus et un moteur JavaScript distincts, pas une couche compatible Rhino. Un futur pont devra exposer explicitement chaque capacité d'automatisation; la version 0.1 ne fournit volontairement aucun pont.

#### Un script peut-il importer un autre fichier local du projet?

Pas dans la version 0.1. Le contrat transfère un seul instantané et pas encore l'arborescence du projet, donc les imports relatifs ne peuvent pas être résolus. La syntaxe ESM dans un fichier unique reste prise en charge.

#### Le plugin prend-il en charge les appareils à pages de 16 KB?

Les segments PT_LOAD des deux exécutables ELF empaquetés sont alignés sur au moins 16 KB. Aucun test réel sur un runtime Android 16 KB n'a encore été effectué, cette version ne revendique donc pas une prise en charge complète vérifiée.

#### Quel APK dois-je installer?

La plupart des appareils Android physiques utilisent `arm64-v8a`. Utilisez `x86_64` baseline pour les émulateurs ou appareils x86_64 compatibles. Le paquet `universal` contient les deux et reste le choix sûr si l'ABI est inconnu.

******

### Interface du plugin

******

Ces identifiants et limites stables sont destinés aux développeurs de l'hôte AutoJs6 et du plugin:

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

État 16 KB: les segments PT_LOAD des ELF `arm64-v8a` et `x86_64` empaquetés respectent l'alignement 16 KB. Aucun appareil ou émulateur Android 16 KB réel n'a encore été exécuté, seul l'alignement ELF est donc vérifié.

******

### Feuille de route

******

La feuille de route distingue le comportement actuel des instantanés de projet prévus, d'un pont AutoJs6 étroit, d'une validation Android plus large et des futures mises à niveau de Bun. Les éléments non cochés sont des plans, pas des fonctions actuelles.

- [Voir ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Historique des versions

******

#### v0.2.0

_2026/09/01_

- `Note` Android 13 (API 33) est désormais la cible minimale officielle; API 28 à 32 restent non prises en charge jusqu'à ce qu'un runtime Bun corrigé réussisse la validation portable
- `Amélioration` Abaisser le minimum Android pris en charge d'Android 14 (API 34) à Android 13 (API 33) tout en conservant les payloads Android officiels et épinglés de Bun 1.4.0
- `Amélioration` Documenter la limite seccomp d'AOSP T: Android 13 autorise la syscall `close_range` brute de Bun, tandis que l'échec sur API 31 montre qu'API 28 à 32 nécessitent un correctif de compatibilité Bun et non un simple changement de manifest
- `Amélioration` Préparer l'expérience Android 9+ avec un backport déterministe en six correctifs du code source Bun, des entrées NDK et conteneur épinglées et des identités immuables pour 22 dépendances actives de la version Android, tout en maintenant explicitement indisponible le runtime non compilé
- `Amélioration` Vérifier chaque APK Debug et Release pour l'alignement ZIP de 16 KB, le contenu ABI exact, les tailles et empreintes SHA-256 verrouillées des payloads Bun, puis vérifier les octets installés sur l'appareil de test Android 13
- `Amélioration` Verrouiller les octets exacts de 19 archives source Bun et de 17 téléchargements directs immuables de la chaîne d'outils, inventorier 181 entrées d'intégrité Cargo et 172 Bun, puis ajouter des matérialiseurs sans écrasement et un précontrôle de build à deux ABI protégé par `buildReady`
- `Dépendance` Ajouter le runtime Kotlin Parcelize requis par Release R8 afin de conserver les classes partagées du contrat Parcelable

#### v0.1.0

_2026/09/01_

- `Note` La première version exécute un seul instantané et n'expose ni globals AutoJs6, ni pont Java, ni projet multifichier, ni imports relatifs au projet
- `Fonctionnalité` Exécuter JavaScript et TypeScript avec l'exécutable Android officiel de Bun 1.4.0 comme moteur `bun` indépendant sélectionné par `"bun";`, avec `bun run --no-install <source>` sans installation automatique des dépendances
- `Fonctionnalité` Transmettre stdout et stderr uniquement par fragments bornés via callback oneway Binder, tandis que le résultat terminal rapporte statut et diagnostic sans contenir les streams complets
- `Fonctionnalité` Prendre en charge l'annulation explicite, un timeout par défaut de 60 secondes, les informations runtime et le préchauffage dans le processus isolé `:bun_runtime`
- `Fonctionnalité` Fournir les binaires Android officiels 64 bits pour `arm64-v8a` et baseline `x86_64`, avec des paquets mono-ABI et `universal`
- `Fonctionnalité` Fournir la découverte du plugin, l'activation Wake protégée, des métadonnées PluginInfo complètes et la documentation utilisateur en 10 langues
- `Amélioration` Utiliser un contrat Binder versionné avec transport de source par ParcelFileDescriptor, limite de source de 16 MiB et limite de sortie combinée de 8 MiB
- `Amélioration` Lancer Bun depuis le répertoire natif Android en lecture seule et vérifier tailles, SHA-256, type ELF, machine et alignement des archives officielles et binaires empaquetés
- `Amélioration` Vérifier un alignement PT_LOAD d'au moins 16 KB pour les deux exécutables tout en indiquant explicitement qu'aucun test Android 16 KB réel n'a été effectué
- `Amélioration` Générer README, instructions du centre de plugins et changelog intégré depuis des JSON validés, avec contrôles CI du build, du Markdown et des artefacts runtime
- `Amélioration` Exiger Android 14 (API 34) après un `SIGSYS` app seccomp sur API 31 pour la syscall 436 `close_range` de Bun; un Sony API 33 a réussi de façon inattendue sans prouver la portabilité, tandis que les allers-retours Binder JS et TS ont réussi sur API 35 et les versions inférieures attendent un fallback upstream

##### Pour plus d'historique

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-fr.md)

******

### Build et vérification

******

Git LFS doit matérialiser les deux binaires épinglés avant la vérification ou le packaging Gradle. Les contrôles locaux standard sont indiqués ci-dessous. JDK 17 ou ultérieur, Node.js et Android SDK 36 sont requis.

```powershell
node tools\bun-runtime\verify-runtime.mjs
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

Le code du plugin est sous [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). L'exécutable officiel de Bun contient le code Bun sous MIT, JavaScriptCore et WebKit liés statiquement sous LGPL-2, ainsi que d'autres composants sous leurs propres licences. Consultez [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) et le [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) épinglé de Bun.

******

### Liens

******

- Projet AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Site officiel de Bun: https://bun.sh/
- Version Bun épinglée: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- Mentions de tiers: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
