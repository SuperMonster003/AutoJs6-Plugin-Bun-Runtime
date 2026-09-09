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

Les deux exécutables ELF empaquetés et toutes les entrées APK satisfont aux contrôles d'alignement 16 KB. Sur un AVD 16 KB sous Android 16 (API 36), l'APK `arm64-v8a` a réussi toute la suite Binder via `libndk_translation`, mais le payload `x86_64` natif s'interrompt avec le code 134 même pour un script minimal; l'arm64 natif n'a pas encore été testé. Ces preuves restent partielles, donc cette version ne revendique toujours pas une prise en charge générale des pages 16 KB.

#### Quel APK dois-je installer?

La plupart des téléphones et tablettes utilisent `arm64-v8a`. Utilisez `x86_64` baseline pour les émulateurs ou appareils x86_64. En cas de doute, installez `universal`, qui contient les deux ABI; un peu plus gros, mais le choix le plus sûr.

******

### Compatibilité

******

- Moteur: Bun officiel 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Système: Android 13 (API 33) ou ultérieur, avec des exécutables officiels 64 bits pour `arm64-v8a` et `x86_64` baseline. Android 9 à 12L (API 28 à 32) ne sont pas encore pris en charge; la FAQ ci-dessus en explique la raison. Les tests sur appareils réels API 33 et API 35 ont réussi.
- Hôte: AutoJs6 build 5278 ou ultérieur, avec le contrat Bun runtime version 1.
- Bornes par exécution: source jusqu'à 16 MiB, sortie combinée stdout et stderr jusqu'à 8 MiB et timeout par défaut de 60 seconds.
- Paquets: les APK mono-ABI gardent l'installation plus légère, tandis que l'APK `universal`, plus gros, contient les deux ABI pris en charge.

******

### Permissions et intégrité

******

- Un superviseur distinct, verrouillé et en lecture seule gère les délais, annulations et limites de sortie, même si le script ignore SIGTERM. Il récupère le processus Bun direct; ce n'est ni un bac à sable ni un gestionnaire de tous les descendants détachés.
- Les composants exportés d'activation (Wake), info et runtime sont protégés par `org.autojs.permission.PLUGIN`, et AutoJs6 effectue toujours ses contrôles habituels d'autorisation des plugins.
- L'instantané du script est placé dans un répertoire privé propre à chaque exécution, et l'exécutable Bun démarre depuis le répertoire de bibliothèques natives Android en lecture seule au lieu d'être copié vers un stockage inscriptible.
- Le lock du dépôt consigne à la fois les archives officielles et les binaires empaquetés dans l'APK; la CI refuse toute dérive de taille, SHA-256 ou propriétés ELF avant le build.
- Le plugin déclare l'accès Internet car des scripts Bun de confiance peuvent utiliser des API réseau comme `fetch`. Le plugin n'est pas un sandbox; n'exécutez que des scripts fiables.

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

État 16 KB: les deux payloads ELF et leurs entrées APK satisfont aux contrôles d'alignement. Sur un AVD 16 KB sous Android 16 (API 36), `arm64-v8a` a réussi les 5 tests Binder via `libndk_translation`, tandis que `x86_64` natif s'interrompt avec le code 134 sur un script minimal; l'arm64 natif reste non testé. La prise en charge générale des pages 16 KB n'est pas revendiquée.

******

### Feuille de route

******

La feuille de route répond à deux questions: ce qui fonctionne maintenant et ce qui vient ensuite. Les éléments cochés décrivent le comportement réel de la version actuelle; les éléments non cochés (projets multifichiers, pont de capacités AutoJs6, prise en charge élargie des versions Android, mises à niveau de Bun, etc.) sont des plans, pas des promesses de prise en charge actuelle.

- [Voir ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Historique des versions

******

#### v0.2.1

_2026/09/10_

- `Note` Version de développement non encore publiée; le plugin officiel exige toujours Android 13 (API 33) ou version ultérieure
- `Correctif` Corriger le repli CLOEXEC au démarrage de Bun expérimental avec un patch MIT verrouillé: parcourir les descripteurs ouverts sans plafonner leurs numéros, préserver les fd 0-3 et quitter si le marquage échoue; ajouter des tests natifs des erreurs et limites et séparer la vérification des entrées de l'acceptation du runtime, sans modifier le runtime officiel ni le minimum Android 13
- `Correctif` Corriger le nettoyage après expiration, annulation et dépassement de sortie dans le plugin officiel avec un superviseur verrouillé en lecture seule: escalade de SIGTERM ignoré vers SIGKILL, attente de la fin du processus Bun direct et vidage de la sortie préservée; Bun 1.4.0 et le minimum Android 13 restent inchangés
- `Correctif` Corriger la terminaison de la sonde isolée de Bun modifié en compilant le wrapper partagé SupervisedProcess et en embarquant le superviseur verrouillé; lier sources, outils et superviseur dans les reçus de schéma 2 et garder les lecteurs de sortie ouverts jusqu'à la terminaison
- `Amélioration` Ajouter cinq tests FD/SIGSYS et valider le correctif de démarrage: quatre appareils arm64 natifs (API 28/31/33/35) et un AVD x86_64 natif sous API 33 réussissent désormais 18/18 deux fois, soit 180/180; les deux compilations propres de chaque ABI sont identiques octet par octet. Conserver les rapports précédents à 17/18 sans modifier le runtime officiel ni le minimum Android 13; Binder expérimental complet et exécution native sur pages de 16 KB restent à valider
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

#### v0.1.0

_2026/09/01_

- `Note` Première version: chaque exécution traite un seul fichier de script autonome; les fonctions intégrées d'AutoJs6, le pont Java, les projets multifichiers et les imports relatifs ne sont pas encore disponibles
- `Fonctionnalité` Ajouter le moteur `bun` autonome: placez `"bun";` sur la première ligne d'un script pour exécuter JavaScript et TypeScript avec l'executable Android officiel de Bun 1.4.0; la commande réelle est `bun run --no-install <source>` et les dépendances ne sont jamais installées automatiquement
- `Fonctionnalité` Renvoyer la sortie en temps réel: stdout et stderr sont diffusés par fragments bornés via oneway Binder callback, et le résultat final ne rapporte que le statut et le diagnostic, sans le flux de sortie complet
- `Fonctionnalité` Exécution contrôlable: les scripts s'exécutent dans le processus isolé du plugin `:bun_runtime`, avec annulation explicite, timeout par défaut de 60 secondes, consultation des informations du runtime et prewarming
- `Fonctionnalité` Fournir les payloads Android 64 bits officiels pour `arm64-v8a` et baseline `x86_64`, ainsi que des paquets mono-ABI et `universal`
- `Fonctionnalité` Offrir l'expérience plugin complète: découverte du plugin, activation protégée par permission (Wake), métadonnées PluginInfo complètes et documentation utilisateur en 10 langues
- `Amélioration` Adopter un contrat Binder versionné transférant la source par ParcelFileDescriptor, avec une limite de 16 MiB pour la source et de 8 MiB pour la sortie combinée
- `Amélioration` Lancer Bun depuis le répertoire read-only de native library d'Android et vérifier la taille, le SHA-256 et les propriétés ELF des archives release épinglées et des binaires empaquetés
- `Amélioration` Vérifier que les deux executables empaquetés ont un PT_LOAD alignment d'au moins 16 KB, tout en documentant honnêtement que le test dans un environnement Android réel en 16 KB n'est pas encore achevé
- `Amélioration` Générer le README, les instructions du centre de plugins et le changelog intégré à partir de sources JSON validées, avec des contrôles CI pour le build, le Markdown et les artefacts du runtime
- `Amélioration` Fixer le minimum provisoire à Android 14 (API 34): sur un appareil réel en API 31 le syscall `close_range` de Bun est tué par seccomp avec `SIGSYS`, un appareil Sony en API 33 a réussi de façon inattendue sans prouver la portabilité, et les tests aller-retour Binder JS et TS ont réussi sur un appareil réel en API 35

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
