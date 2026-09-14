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

Le fonctionnement du plugin est simple: AutoJs6 envoie le contenu du script au plugin, le plugin démarre l'exécutable Android officiel de Bun dans son propre processus isolé, et la sortie ainsi que le résultat final reviennent en temps réel dans la console AutoJs6. C'est du vrai Bun, pas un alias ni une couche d'émulation au-dessus de Rhino ou Node.js.

******

### Installation et utilisation

******

1. Préparez l'environnement: installez AutoJs6 build 5278 (6.8.0) ou ultérieur sur Android 13 (API 33) ou ultérieur.
2. Installez le plugin: téléchargez et installez l'APK correspondant à l'appareil depuis [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). Choisissez `arm64-v8a` pour la plupart des téléphones et tablettes, `x86_64` pour les émulateurs ou appareils x86_64, ou `universal` en cas de doute (un peu plus gros, fonctionne sur les deux).
3. Activez le plugin: ouvrez le centre de plugins AutoJs6 et activez Bun Runtime. Si le plugin fraîchement installé apparaît arrêté, touchez l'action `Activer` proposée par l'hôte.
4. Exécutez un script: placez `"bun";` seul sur la première ligne d'un fichier JavaScript ou TypeScript (guillemets et point-virgule compris), puis exécutez le fichier depuis AutoJs6 comme d'habitude.

> Chaque exécution traite un instantané du fichier courant (la commande réelle est `bun run --no-install <source>`); le plugin n'installe jamais automatiquement de dépendances npm et ne lit jamais d'autres fichiers du projet. Lisez les limites actuelles ci-dessous avant de migrer un projet Rhino ou Node.js existant vers Bun.

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

******

### Limites actuelles

******

- Un fichier par exécution: le plugin reçoit et exécute un seul instantané de source sans le répertoire du projet, donc les imports relatifs comme `import './utils.js'` ne peuvent pas être résolus. La syntaxe ESM à l'intérieur du fichier unique n'est pas affectée; quand plusieurs modules sont nécessaires, regroupez-les d'abord en un seul fichier sur un ordinateur (voir la FAQ).
- Pas de fonctions intégrées AutoJs6: les API d'automatisation comme `click()` et `toast()` et les globals Rhino n'existent pas dans les scripts Bun, qui conviennent donc pour l'instant aux tâches indépendantes de l'hôte comme le calcul, le traitement de texte et les requêtes réseau.
- Pas de pont Java: les scripts Bun ne peuvent pas accéder directement aux classes ou objets Java du processus AutoJs6.
- Pas de promesse de toolchain Bun complet: `bunx`, la production d'exécutables sur l'appareil, la compilation C au runtime et les addons natifs arbitraires restent hors périmètre.
- Pas un sandbox de sécurité: un script Bun s'exécute comme code de confiance dans le processus du plugin et peut utiliser les permissions accordées au plugin, donc n'exécutez que des scripts fiables.

******

### FAQ

******

#### Pourquoi les fonctions AutoJs6 comme `click()` et `toast()` sont-elles indisponibles dans les scripts Bun?

Bun s'exécute dans un processus séparé et constitue un moteur JavaScript complètement différent de Rhino, donc les globals AutoJs6 n'apparaissent pas dans les scripts Bun. Permettre aux scripts Bun d'appeler des capacités d'automatisation nécessite un pont hôte exposant chaque capacité explicitement; la version actuelle n'en fournit volontairement pas encore. Voir la feuille de route pour les plans.

#### Puis-je utiliser des paquets npm?

Pas en les installant sur l'appareil. Le plugin s'exécute toujours avec `--no-install` et ne télécharge jamais de dépendances. Si une bibliothèque tierce est vraiment nécessaire, regroupez d'abord le script et ses dépendances JS pures en un seul fichier sur un ordinateur, par exemple avec `bun build`, puis exécutez ce fichier sur l'appareil; les paquets reposant sur des addons natifs ne peuvent pas être utilisés ainsi.

#### Un script peut-il faire un `import` d'autres fichiers du projet?

Pas pour l'instant. Le contrat du plugin transfère un seul instantané de source sans le répertoire du projet, donc les imports relatifs ne peuvent pas être résolus. La prise en charge des projets multifichiers figure sur la feuille de route, et la syntaxe ESM dans le fichier unique fonctionne normalement.

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

#### v0.2.2

_2026/09/12_

- `Correctif` Corriger la fuite de descripteurs au rechargement watch expérimental lorsque close_range échoue: marquer les FD réels CLOEXEC avant exec avec le repli borné existant et arrêter si la préparation reste incomplète. Conserver stdio, IPC explicite et le traitement des signaux. Les contrôles GCC/Clang sur les sources complètes couvrent exec réel, FD élevés, limites strictes réduites et erreurs injectées; consigner séparément les nouveaux builds natifs et les suites Android inchangées. Préserver les échecs historiques, les binaires officiels et les limites de distribution
- `Correctif` Corriger la vérification des anciens candidats JSC expérimentaux après une mise à jour des sources Bun: lier l'archive de compilation complète et immuable tout en conservant les contrôles stricts des entrées actuelles pour les nouvelles compilations
- `Correctif` Correction de la livraison prématurée des signaux bloqués en attente pendant les attentes epoll Android expérimentales: conserver le masque de l'appelant et maintenir l'exclusion existante de epoll_pwait2. Les régressions GCC/Clang compilent la fonction complète originale et corrigée; les nouvelles compilations natives et les tests appareils inchangés sont consignés séparément, en conservant les échecs des onze correctifs et les limites du support officiel. Les suites inchangées passent deux fois dans cinq environnements natifs à pages de 4 KiB: 330/330 sondes et 80/80 tests Binder. Deux échecs de démarrage ART sur API 28 sont archivés séparément; la troisième tentative avec les mêmes APK passe les deux tours. La validation Samsung ARM64 du nouveau code est terminée pour ces suites fixes; le rebase JSC est enregistré séparément
- `Correctif` Résultat historique des onze correctifs: Correction de la livraison prématurée de SIGSYS en attente lors du spawn Android expérimental: le parent conserve le masque de l'appelant, seul l'enfant autorise le traitement pendant sa préparation, et le chemin existant d'entrée dans le cgroup est utilisé lorsque SIGSYS est bloqué. Les régressions GCC/Clang couvrent la fonction de production complète et les échecs témoins de l'ancien code; les preuves du nouveau code restent distinctes des validations historiques et du support officiel. Le suivi sur appareil conserve le signal au retour de spawn, mais le délivre encore pendant l’attente asynchrone; les registres et le masque epoll lus sans modification identifient le prochain blocage, et la validation complète des 33 sondes échoue toujours
- `Correctif` Permettre une nouvelle tentative à la demande après 30 secondes en cas d'échec temporaire du contrôle de disponibilité, partager les contrôles concurrents et limiter chaque flux de sortie à 4 KiB. Ajouter les diagnostics API, ABI, étape, identité du runtime, code de sortie et nouvelle tentative en conservant les résumés traduits; signaler les signaux déduits sans modifier les binaires natifs ni les limites de prise en charge
- `Correctif` Corrige le sondage pidfd Android expérimental lorsque le premier spawn asynchrone démarre avec SIGSYS bloqué, en préservant le masque appelant et les signaux en attente via le repli waiter existant. Le runtime à dix correctifs réussit les 31 sondes inchangées (310/310) et les huit tests Binder complets (80/80) dans cinq environnements natifs 4 KiB. Les preuves de fin de compilation indiquent explicitement les codes de sortie originaux perdus; le premier échec de démarrage ART est archivé séparément. Le rebase JSC et Release restent à valider pour ces nouveaux binaires; les binaires officiels sont inchangés
- `Correctif` Corriger l'arrêt de JavaScriptCore expérimental au démarrage sur x86_64 natif 16 KiB en recompilant le WebKit épinglé avec des réglages explicites de grandes pages, JIT et allocateurs puis en rééditant les liens de Bun: deux passages Binder réussissent sur les AVD 4 KiB et 16 KiB (32/32). Les binaires officiels et leur garde 4 KiB restent inchangés; la validation Release est distincte
- `Amélioration` Ajouter quatre modes API hors ligne fixes via le service Binder de production: fichiers et surveillance de répertoire, DNS local par instance, TCP binaire avec fermeture partielle et HTTP avec redirection/lecture en flux/annulation. Lier les sources exactes, les APK et les UID des deux paquets; conserver les échecs, les comptes des suites existantes et les limites de publication
- `Amélioration` Ajouter un diagnostic distinct conservant l'ordre des sept modes de charge, l'arrêt anticipé DFG et les assertions. Enregistrer des données bornées par profil avant de relancer les erreurs, vérifier les sources exactes et les UID des deux paquets, sans modifier les résultats historiques ni les comptes de compatibilité
- `Amélioration` Ajouter un diagnostic distinct et borné des piles complètes et des appelants intégrés avec des contrôles fixes de la correspondance PC. Conserver la charge intensive et le seuil d'origine, vérifier les options finales du profiler, garder la première pile complète par classe avec les omissions dues aux limites d'octets, et contrôler séparément les appelants et les décisions du compilateur sans ajouter de validation de compatibilité
- `Amélioration` Ajouter une comparaison bornée du mappage PC pour les échantillons JSC: réutiliser exactement les quatre phases, vérifier les options finales et conserver les décisions d'inlining, les niveaux réels d'exécution et la sortie 1. Inverser l'ordre au second tour sans modifier les tests initiaux, limites, binaires ou garanties de prise en charge
- `Amélioration` Ajouter un diagnostic JSC fixe en quatre phases pour le redémarrage et la remise à zéro des données, avec un contrôle explicite sans exécution de la fonction cible et une sortie 1. Conserver témoins, horodatages et preuves UID brutes sans modifier les tests initiaux ni prétendre reproduire la panne historique
- `Amélioration` Ajouter un diagnostic DFG indépendant et borné avec durées par capture, appels, répartition des frames et compteurs d'optimisation. Conserver les sorties pour échantillons insuffisants et les preuves exactes des sources, APK et UID sans modifier le test de pression initial, ses limites, le runtime ou les comptes de compatibilité
- `Amélioration` Ajouter un guide pour libérer l’espace des caches de compilation et des émulateurs retirés, tout en conservant la provenance du runtime, les artefacts de test et les journaux d’échec
- `Amélioration` Verrouillage séparé du candidat JSC à grandes pages avec treize correctifs: deux nouvelles compilations propres de Bun conservent le code de sortie réel 0, des binaires complets identiques et 21 entrées inchangées. Réutilisation des bibliothèques JSC indépendantes et ICU; liaison séparée des nouveaux APK et des régressions Binder/sept modes de charge, sans transférer les validations historiques ni élargir la publication
- `Amélioration` Ajout de captures SIGABRT bornées en lecture seule aux diagnostics watch/reload fixes, en conservant les signaux et les budgets. Seize observations avec/sans traçage sur ARM64 natif API 28/31 réalisent 32 rechargements et capturent 24 SIGSYS ordinaires; paquets et UID nettoyés. La cause de l’arrêt API 28 initial non reproduit reste ouverte, sans nouvelle validation de compatibilité
- `Amélioration` Ajouter une régression fixe watch/reload en modes native/TRAP sans modifier le runtime à douze correctifs ni les 33 sondes initiales. Quatre appareils ARM 64 avec pages 4 KiB réussissent 264/264 sondes initiales, mais 14/16 nouveaux modes échouent, révélant 28 fuites de descripteurs sur 32 rechargements. Le contrôle natif Sony 5.15 réussit et le TRAP forcé échoue. Conserver trois lots APK liés aux sources et les corrections initiales du validateur, vérifier le nettoyage des paquets et UID, et garder ouverts la correction native, la compatibilité étendue et Release
- `Amélioration` Terminer la régression Samsung API 32 à douze correctifs sur SM-F936U / ARM64 natif / 4 KiB: les sondes inchangées passent 66/66 et toute la suite Binder 16/16 en deux tours. Les trois APK du lot API 36 sont réutilisés; 40 points de contrôle du signal en attente et 12 observations de processus enfants passent. Les paquets sont supprimés, les trois UID sans processus vérifiés et le serveur ADB privé fermé sans action sur les AVD. Les deux validations Samsung de ces suites fixes sont terminées; sept environnements de base totalisent 462/462 sondes et 112/112 Binder. La couverture élargie, la charge et Release restent ouverts
- `Amélioration` Valider le runtime à douze correctifs inchangé sur Samsung SM-A566B / API 36 / ARM64 natif / pages matérielles de 16 KiB: deux tours passent les 33 sondes (66/66) et toute la suite Binder (16/16). Quatre modes de signal en attente préservent 40 points de contrôle et 12 observations de processus enfants avant une livraison par appelant. Les mêmes APK sont réutilisés sans nouvelle compilation native, les trois UID sont vérifiés après désinstallation et le serveur ADB privé est fermé sans action sur les AVD. Six environnements de base totalisent 396/396 sondes et 96/96 Binder; ARM64 API 32, la couverture élargie et Release restent ouverts
- `Amélioration` Valider le candidat JSC à grandes pages avec douze correctifs sur x86_64 natif et API 36 avec des pages utilisateur de 4 KiB et 16 KiB: les tests Binder inchangés passent 32/32 et les modes de charge fixes 28/28 avec une paire APK liée à 83 entrées. Conserver séparément la première interruption du service par manque de mémoire; la reprise complète avec les mêmes APK passe sans modifier les réglages ni les limites. Vérifier les deux UID après nettoyage et distinguer émulation x86, base Samsung et validation de publication
- `Amélioration` Lier un candidat JSC à grandes pages avec douze correctifs à deux nouvelles compilations Bun identiques, avec codes de sortie réels conservés et 21 entrées de compilation inchangées. Réutiliser exactement les bibliothèques JSC indépendantes originales et ICU, conserver les candidats historiques et relier Binder isolé au nouveau verrou de source. Le scénario de pression, son validateur et ses limites restent inchangés; les validations des appareils et de Release restent distinctes
- `Amélioration` Ajouter des tests fixes de spawn avec SIGSYS en attente et un traçage indépendant. Les deux nouveaux modes échouent deux fois sur ARM64 natif avec API 28/31, tandis que les 31 cas initiaux passent; huit traces confirment la livraison anticipée de SI_TKILL. Archiver les échecs, les liens sources/APK et le nettoyage sans modifier les binaires natifs ni élargir la compatibilité annoncée
- `Amélioration` Traduire les résumés d'erreurs dans les dix langues, conserver les codes stables et les détails techniques bornés, et générer l'aide sur l'activation, Android, les délais et la limite de sortie à partir des mêmes ressources Android. Afficher les refus de taille de page mis en cache dans la langue actuelle et préserver les caractères Unicode entiers lors de la troncature des diagnostics
- `Amélioration` Ajouter une matrice générée des preuves de compatibilité avec un index complet des sources, les empreintes des archives et des contrôles CI de dérive; conserver les résultats par runtime, appareil et suite, y compris les échecs et diagnostics préliminaires, sans nouvelle validation sur appareil ni extension de la prise en charge officielle
- `Amélioration` Valider le nouveau candidat x86 à grandes pages avec dix correctifs sur API 36, avec des pages utilisateur de 4 KiB et 16 KiB: Binder inchangé réussit 32/32 et les modes de pression fixes 28/28 avec une même paire APK liée à 77 entrées. Archiver les octets, résultats bruts et nettoyages séparément des preuves historiques; le mode x86 16 KiB reste émulé sur des pages noyau de 4 KiB, sans validation Release ni de performances
- `Amélioration` Lier séparément un candidat JSC grandes pages à dix correctifs, avec deux compilations Bun propres identiques, les vrais codes de sortie conservés et les entrées JSC réutilisées exactes. Les outils Binder isolés utilisent le nouveau verrou lié aux sources; les binaires historiques et officiels sont conservés, et les validations appareil et Release restent distinctes
- `Amélioration` Ajouter un guide de dépannage en chinois avec un script minimal, des vérifications symptôme/cause/action et des consignes de rapport limité; le relier aux dix langues du README sans modifier les capacités du runtime
- `Amélioration` Termine la régression Samsung du runtime à dix correctifs inchangé: ARM64 natif API 32 / 4 KiB et API 36 / 16 KiB réussissent chacun deux séries de 31 sondes (62/62) et deux séries complètes de huit tests Binder (16/16), avec des APK identiques sur les deux appareils. Sept environnements natifs totalisent 434/434 sondes et 112/112 Binder. Lie les preuves de source, APK et nettoyage sans recompiler le code natif ni utiliser les AVD; le rebase JSC, la matrice élargie et Release restent ouverts
- `Amélioration` Ajouter un observateur SIGSYS de test indépendant: quatre échecs sur ARM64 natif avec API 28 identifient directement pidfd_open, avec des échecs identiques sans traçage et des contrôles réussis sur API 31. Lier les preuves brutes, conserver l'échec initial de l'outil et vérifier la transmission des signaux, le rejet des altérations et le nettoyage; ce diagnostic ne valide ni nouveau runtime, ni Binder, ni Release
- `Amélioration` Ajouter deux tests fixes de spawn asynchrone avec SIGSYS bloqué sans changer les 29 définitions initiales ni les octets natifs: quatre environnements natifs 4 KiB réussissent 248/248, mais Sony API 28 échoue deux fois dans chacun des nouveaux modes avec le code 159 (58/62 au total). Conserver les quatre échecs dans une archive stricte distincte et laisser la validation de compatibilité ouverte; nettoyer les paquets, processus UID et AVD de cette session, sans nouvelle acceptation Binder, 16 KiB ou Release
- `Amélioration` Compléter la couverture ARM64 native 16 KiB des quatre modes de limite dure des FD sur Samsung SM-A566B / API 36: le même APK et les 29 sondes inchangées passent deux tours (58/58), dont huit cas avec close_range natif et repli après TRAP forcé. Vérifier l'absence de processus UID après désinstallation sans intervenir sur les AVD; sept environnements totalisent 406/406. Sans reconstruction native, nouveau test Binder ni validation Release
- `Amélioration` Valider Samsung Galaxy Z Fold4 SM-F936U avec API 32 / Android 12L effectif, ARM64 natif et pages de 4 KiB: deux tours valident la suite Binder existante (16/16) et les 29 sondes applicatives inchangées (58/58), dont les huit cas de limite dure. Lier exactement APK, sources et preuves brutes, supprimer les trois paquets de test et vérifier l'absence de processus UID sans intervenir sur les AVD. Les binaires restent inchangés; les nouveaux cas ARM64 natif 16 KiB, la matrice étendue et la validation Release restent ouverts
- `Amélioration` Ajout de quatre sondes Android de limite dure des FD sans modifier les 25 définitions ni les octets du runtime: deux tours de 29/29 dans cinq environnements natifs 4 KiB (290/290), dont 40 cas de limite dure. Vérification de CLOEXEC au démarrage et des deux API spawn après abaissement des limites souple/dure à 128, sans changer celles de l'application et du supervisor. Preuves brutes liées, paquets de test désinstallés et AVD de cette session arrêté; FD 70000, nouveaux cas natifs 16 KiB et validation Release restent ouverts
- `Amélioration` Ajouter une validation de charge JSC bornée et distincte sur API 36 x86_64: sept modes hors ligne passent deux fois avec des pages utilisateur de 4 KiB et de 16 KiB émulées (28/28), avec des échantillons réels LLInt/Baseline/DFG/FTL, GC, Wasm et 64 sorties normales de workers. Les mêmes APK passent aussi la suite Binder inchangée (32/32). Consigner séparément les mappings noyau de 4 KiB, conserver les résultats préliminaires et nettoyer les appareils de test propres; les binaires natifs, le support stable et les critères Release restent inchangés
- `Amélioration` Compléter la validation native x86_64 / 4 KiB sur API 29 et 32: deux passages par environnement ajoutent 32/32 tests Binder et 100/100 sondes applicatives inchangées, complétant la couverture Binder x86 des API 28-32. Ajouter un archivage strict des rapports bruts, sources et preuves de nettoyage; conserver les preuves historiques, laisser ARM64 API 32 et Release en attente, et fermer uniquement les deux AVD démarrés pour cette exécution
- `Amélioration` Ajouter un plugin de test facultatif dans un paquet distinct réutilisant le service de production et les huit tests Binder complets avec Bun à neuf correctifs: deux passages réussissent dans neuf environnements natifs (144/144), dont ARM64 16 KiB; conserver les liens APK/sources et les preuves de nettoyage sans élargir le support stable
- `Amélioration` Ajouter une sonde CLI fixe hors ligne pour lchmod/fchmodat2 interne sans modifier les binaires ni les 24 sondes initiales: les 25 passent deux fois dans six environnements natifs (300/300), dont ARM64 16 KiB. Vérifier les permissions, les liens répétés, no-follow, EIO ignoré et le passage par SIGSYS avec nettoyage borné des threads; conserver les premiers échecs du harnais, supprimer les paquets de test et fermer l'AVD lancé. Binder expérimental complet et Release restent à valider
- `Amélioration` Valider Bun expérimental à neuf correctifs sur Samsung ARM64 natif / API 36 / 16 KiB avec le même APK et les 24 sondes inchangées: 48/48 sur deux passages, 48 assertions de chemins réussies et 12 requêtes de sortie refusant la sentinelle; désinstaller le paquet de test sans processus UID restant ni démarrage ou arrêt d'AVD. Binder expérimental complet, Release et x86_64 16 KiB restent à valider
- `Amélioration` Vérification à la compilation de l'alignement des pages de 16 KB des bibliothèques natives 64 bits, avec contrôle du contrat manifest et rapports JSON
- `Dépendance` Aligner le plugin en ligne platform-versions sur la version 1.8.0 fixée par le dépôt, sans modifier native-alignment

#### v0.2.1

_2026/09/10_

- `Note` Version de développement non encore publiée; le plugin officiel exige toujours Android 13 (API 33) ou version ultérieure
- `Correctif` Préserver le service expérimental des répertoires statiques sans openat2 grâce à un repli MIT verrouillé relatif aux descripteurs: fixer les composants, résoudre les liens internes, refuser les liens hors racine et magiques, borner le parcours et gérer les erreurs et les FD; accès Bun.file/node:fs, moteur officiel et minimum Android 13 inchangés
- `Correctif` Corriger le repli Linux spawn FD du runtime expérimental avec un correctif MIT verrouillé: énumérer les descripteurs réels par syscall directs et tampon fixe sur la pile, traiter les FD dépassant les limites souples/dures abaissées et l'ancien plafond 65536, et échouer avant exec si l'isolation est incomplète; ajouter des régressions vfork/exec, erreurs, symboles et témoins avec l'ancienne implémentation sans modifier Bun officiel ni le minimum Android 13
- `Correctif` Corriger le repli CLOEXEC au démarrage de Bun expérimental avec un patch MIT verrouillé: parcourir les descripteurs ouverts sans plafonner leurs numéros, préserver les fd 0-3 et quitter si le marquage échoue; ajouter des tests natifs des erreurs et limites et séparer la vérification des entrées de l'acceptation du runtime, sans modifier le runtime officiel ni le minimum Android 13
- `Correctif` Corriger le nettoyage après expiration, annulation et dépassement de sortie dans le plugin officiel avec un superviseur verrouillé en lecture seule: escalade de SIGTERM ignoré vers SIGKILL, attente de la fin du processus Bun direct et vidage de la sortie préservée; Bun 1.4.0 et le minimum Android 13 restent inchangés
- `Correctif` Corriger la terminaison de la sonde isolée de Bun modifié en compilant le wrapper partagé SupervisedProcess et en embarquant le superviseur verrouillé; lier sources, outils et superviseur dans les reçus de schéma 2 et garder les lecteurs de sortie ouverts jusqu'à la terminaison
- `Amélioration` Valider le repli des répertoires avec deux compilations propres identiques par ABI et les mêmes 24 tests deux fois dans cinq environnements natifs de 4 KiB (240/240): les 60 assertions de sortie auparavant en échec refusent la sentinelle, le service normal reste utilisable. GCC/Clang et GCC ASan/UBSan passent; paquets et AVD nettoyés. Échecs historiques conservés; ARM64 natif 16 KiB, Binder complet et publication restent à valider
- `Amélioration` Référence précédente en échec (a260ef308): Ajouter un 24e test de confinement des répertoires openat2 sans modifier le runtime expérimental: cinq environnements natifs à pages de 4 KiB obtiennent deux fois 23/24. Les 230 observations initiales passent, mais 10 nouveaux échecs enregistrent 60 lectures d'une sentinelle synthétique hors de la racine configurée via des liens relatifs, absolus et magiques. Archiver la validation en échec sans assouplir les assertions; aucun plantage, blocage ni processus résiduel du UID de test, et l'AVD démarré est arrêté. La correction native reste à faire
- `Amélioration` Corriger l'audit de fchmodat2: sys::lchmod interne utilise la constante majuscule SYS_FCHMODAT2, tandis que les deux exports publics lchmod de node:fs sous Android sont absents lors des 10 passages. Aucun repli interne de liaison des exécutables de paquets ni installation de dépendances n'a été exécuté; conserver le rapport historique et maintenir la distribution bloquée
- `Amélioration` Étendre à 23 tests la suite de syscalls du runtime expérimental inchangé : cinq environnements natifs à pages de 4 KiB passent deux fois (230/230), dont 60 observations TRAP vers ENOSYS et 16 replis de copie/attente contrôlés par EIO ; exclure explicitement quatre cas API 28 limités par le noyau ou la politique des preuves de parcours des branches, préserver les assertions et preuves historiques, puis nettoyer les paquets de test et l'AVD démarré. Les matrices complètes syscalls/Binder et les nouveaux tests natifs 16 KiB restent ouverts
- `Amélioration` Valider la correction de spawn dans six environnements natifs: les 20 mêmes tests passent deux fois sur arm64 API 28/31/33/35 et x86_64 API 33 (4 KiB), ainsi que Samsung arm64 API 36 (16 KiB), soit 240/240; les deux ABI sont reproductibles sur deux builds propres, les 36 cas de terminaison forcée passent, les paquets de test sont supprimés et l'AVD lancé est arrêté. Les anciens échecs sont conservés; la validation complète de Binder expérimental et la publication restent ouvertes
- `Amélioration` Valider l'exécution ARM64 native avec pages de 16 KiB sur Samsung Remote Test Lab SM-A566B (API 36): l'APK de développement v0.2.1 arm64 uniquement avec Bun officiel et superviseur verrouillé réussit les 8 tests Binder deux fois, avec redémarrage, empreintes installées et 10 cas de terminaison forcée; archiver les liens exacts source/APK/journaux et désinstaller les tests, en gardant séparées les validations Release et x86_64
- `Amélioration` Ancienne référence en échec (c240d6c68): Consigner le runtime expérimental inchangé sur le même appareil ARM64 natif de 16 KiB à 19/20 deux fois: close_range natif, marquage au démarrage et cycle de vie passent, mais la fuite spawn connue avec TRAP forcé et RLIMIT_NOFILE abaissé demeure; préserver les deux échecs sans annoncer une validation complète de Binder expérimental ou du runtime
- `Amélioration` Ancienne référence en échec (c240d6c68): Étendre la suite expérimentale à 20 tests avec abaissement de RLIMIT_NOFILE: quatre appareils arm64 natifs (API 28/31/33/35) obtiennent deux fois 18/20 et un AVD x86_64 natif sous API 33 deux fois 19/20, tous avec des pages de 4 KiB. Les 180 observations initiales passent toujours; 18 nouveaux échecs montrent que les deux API de spawn transmettent fd 256 après réduction de la limite souple à 128. Archiver échecs, restauration des limites et nettoyage sans changer le runtime ni annoncer le défaut corrigé
- `Amélioration` Documenter les options ARM64 avec pages de 16 KiB sur Windows x64: VMware et WSL seuls ne fournissent pas Android ARM64 natif; distinguer l'émulation système complète et proposer les appareils Samsung distants de 16 KiB via RDB/ADB, sous réserve de disponibilité et de permissions réelles, sans annoncer une nouvelle validation sur appareil
- `Amélioration` Résultat précédent de 18 tests: Ajouter cinq tests FD/SIGSYS et valider le correctif de démarrage: quatre appareils arm64 natifs (API 28/31/33/35) et un AVD x86_64 natif sous API 33 réussissent 18/18 deux fois, soit 180/180; les deux compilations propres de chaque ABI sont identiques octet par octet. Conserver les rapports précédents à 17/18 sans modifier le runtime officiel ni le minimum Android 13; Binder expérimental complet et exécution native sur pages de 16 KB restent à valider
- `Amélioration` Lier les sources du superviseur, les instructions de compilation avec NDK fixe et les empreintes par ABI dans le schéma 2 de corresponding-source, avec contrôle exact des fichiers sources archivés et sans modifier les ressources v0.2.0
- `Amélioration` Ajouter un constructeur d'APK isolé réservé aux tests et un lanceur ciblant explicitement un appareil pour Bun modifié reproductible, avec vérification exacte des sources/APK/runtime, signature de test temporaire et rapports machine bornés
- `Amélioration` Réussir les 13 tests de processus applicatif deux fois sur des appareils arm64 natifs avec API 28, 31, 33 et 35: 24 cas ignorant SIGTERM lors du délai, du dépassement de sortie ou de l'annulation après disponibilité confirment la fin du fils et du superviseur et le nettoyage du répertoire; conserver le rapport d'échec initial 10/12 sans revendiquer un Binder expérimental complet ni élargir le support Android
- `Amélioration` Archiver les vérifications des APK et sources publiés avec v0.2.0 et les validations des paquets signés sur appareils, sans réécrire le tag publié ni étendre la compatibilité Android ou 16 KB
- `Dépendance` Mettre à jour le plugin de compilation en ligne autojs6-platform-versions de 1.7.3 vers 1.7.4 et synchroniser la version exigée par le dépôt

#### v0.2.0

_2026/09/08_

- `Note` Cette version abaisse la configuration minimale d'Android 14 à Android 13 (API 33); les versions Android 9 à 12L (API 28 à 32) restent non prises en charge tant qu'un runtime Bun corrigé n'a pas passé la validation de portabilité
- `Correctif` Renforcer la vérification des fichiers de Release: comparer directement la taille et le SHA-256 de l'archive WebKit aux valeurs verrouillées et accepter les différents formats de sortie d'apksigner
- `Correctif` Identifier l'ABI du runtime installé à partir du SHA-256 du payload épinglé plutôt que de l'ordre d'itération de la table ABI, et faire exécuter au préchauffage un test JavaScript minimal afin de rejeter un runtime inutilisable avant le démarrage des scripts utilisateur
- `Correctif` Rejeter le runtime officiel x86_64 incompatible avant le lancement du processus lorsque Android utilise des pages supérieures à 4 KiB, après avoir isolé l'échec au plafond de 4 KiB du JavaScriptCore épinglé, en remplaçant un abort Bun déterministe par un diagnostic borné
- `Amélioration` Abaisser la configuration minimale: le payload Android officiel épinglé de Bun 1.4.0 est conservé et le plancher de prise en charge est assoupli d'Android 14 (API 34) à Android 13 (API 33), couvrant davantage d'appareils
- `Amélioration` Identifier la cause racine des échecs sur les anciennes versions: depuis Android 13 le seccomp du système autorise le raw syscall `close_range` invoqué par Bun, tandis qu'un échec sur appareil réel en API 31 prouve que les API 28 à 32 exigent de corriger Bun lui-même, un simple changement de manifest ne suffisant pas
- `Amélioration` Préparer la future prise en charge d'Android 9+: un plan de correctifs du code source de Bun rejouable avec précision (6 correctifs) est établi et les entrées de build sont verrouillées (NDK et conteneur épinglés, 22 dépendances actives d'Android release); ce travail établit une voie expérimentale séparée et ne modifie pas le runtime officiel inclus dans les paquets actuels
- `Amélioration` Renforcer les contrôles de qualité des paquets: chaque APK Debug et Release vérifie le ZIP alignment de 16 KB, le contenu ABI exact ainsi que la taille et le SHA-256 du payload Bun épinglé, et les octets du payload installé sont contrôlés sur un appareil de test Android 13
- `Amélioration` Durcir la chaîne d'approvisionnement: les octets exacts de 19 archives sources de Bun et de 17 téléchargements de toolchain sont épinglés, 181 entrées d'intégrité Cargo et 172 du registre Bun sont inventoriées, et un materializer refusant l'écrasement ainsi qu'une prévérification de build double ABI protégée par la porte `buildReady` sont ajoutés
- `Amélioration` Enrichir la bibliothèque d'exemples prêts à copier et à exécuter avec des cas commentés de fetch réseau, de fichiers dans l'espace de travail privé, de streaming stdout/stderr et de types TypeScript; ajouter une porte documentaire qui impose la directive `"bun";` en première ligne et les limites de source unique sans installation
- `Amélioration` Valider l'exécution 16 KB sur un AVD Android 16 (API 36) avec PAGE_SIZE=16384 imposé: l'APK mono-ABI `arm64-v8a` réussit les 5 tests d'instrumentation Binder via `libndk_translation`, tandis que le payload `x86_64` natif s'interrompt avec le code 134 même pour un script minimal; la prise en charge générale des pages 16 KB n'est donc pas revendiquée
- `Amélioration` Clore la partie Cargo de la chaîne d'approvisionnement expérimentale Android 9+: verrouiller et matérialiser les 181 archives crates.io (26 354 160 octets), générer une source de répertoire vérifiée par checksums et prouver que la version figée de Cargo charge tout le workspace Bun avec `--locked --offline` et un `CARGO_HOME` vide; ce résultat couvre uniquement les entrées Cargo et ne clôt pas à lui seul les autres entrées de build
- `Amélioration` Clore la partie registre Bun de cette chaîne: résoudre 172 références du lock en 125 archives npm Linux x64 uniques (31 498 870 octets), reconstruire un cache minimal depuis les tarballs verrouillés et réussir les trois installations frozen dans le conteneur Ubuntu figé, réseau désactivé et cache en lecture seule; `esbuild@0.21.5` est la seule dépendance avec un postinstall approuvé
- `Amélioration` Achever la porte de build reproductible du runtime patché sans le distribuer: verrouiller 155 archives hôte `.deb` (422 223 096 octets) dans une image OCI reproductible, étendre la clôture Cargo à 206 archives uniques, effectuer deux builds propres sans réseau des deux ABI 64 bits avec des résultats identiques octet par octet, puis verrouiller les audits ELF en Node pur; les sondes shell directes API 28 et 31 réussissent, tandis que les portes APK et processus applicatif restent ouvertes
- `Amélioration` Implémenter des assets de Release vérifiables pour les sources correspondantes: séparer les sources des APK dans le même Release; empaqueter les sources Bun/WebKit/JSC exactes, 19 archives native, 206 Cargo et 125 npm, avec patches, instructions de build/relink et avis public de licences; fractionner les gros assets à 1,9 Go, lier les octets APK/runtime/source par un manifest lisible par machine et SHA256SUMS, puis publier le draft seulement après concordance des SHA-256 GitHub; ceci atteste une vérification technique automatisée, pas une approbation juridique
- `Dépendance` Ajouter le runtime Kotlin Parcelize afin que R8 en Release conserve la classe partagée du contrat Parcelable

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
