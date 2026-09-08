******

### Historique des versions

******

# v0.2.1

###### 2026/09/08

* `Note` Version de développement non encore publiée; le plugin officiel exige toujours Android 13 (API 33) ou version ultérieure
* `Correctif` Corriger le nettoyage après expiration, annulation et dépassement de sortie dans le plugin officiel avec un superviseur verrouillé en lecture seule: escalade de SIGTERM ignoré vers SIGKILL, attente de la fin du processus Bun direct et vidage de la sortie préservée; Bun 1.4.0 et le minimum Android 13 restent inchangés
* `Amélioration` Lier les sources du superviseur, les instructions de compilation avec NDK fixe et les empreintes par ABI dans le schéma 2 de corresponding-source, avec contrôle exact des fichiers sources archivés et sans modifier les ressources v0.2.0
* `Amélioration` Ajouter un constructeur d'APK isolé réservé aux tests et un lanceur ciblant explicitement un appareil pour Bun modifié reproductible, avec vérification exacte des sources/APK/runtime, signature de test temporaire et rapports machine bornés
* `Amélioration` Consigner les tests en processus applicatif arm64 natif sur API 28, 31, 33 et 35: chaque appareil réussit 10 tests sur 12 lors de deux passages; les tests de délai et de sortie excessive échouent si SIGTERM est ignoré, donc la terminaison forcée reste bloquante pour la publication
* `Amélioration` Archiver les vérifications des APK et sources publiés avec v0.2.0 et les validations des paquets signés sur appareils, sans réécrire le tag publié ni étendre la compatibilité Android ou 16 KB
* `Dépendance` Mettre à jour le plugin de compilation en ligne autojs6-platform-versions de 1.7.3 vers 1.7.4 et synchroniser la version exigée par le dépôt

# v0.2.0

###### 2026/09/08

* `Note` Cette version abaisse la configuration minimale d'Android 14 à Android 13 (API 33); les versions Android 9 à 12L (API 28 à 32) restent non prises en charge tant qu'un runtime Bun corrigé n'a pas passé la validation de portabilité
* `Correctif` Renforcer la vérification des fichiers de Release: comparer directement la taille et le SHA-256 de l'archive WebKit aux valeurs verrouillées et accepter les différents formats de sortie d'apksigner
* `Correctif` Identifier l'ABI du runtime installé à partir du SHA-256 du payload épinglé plutôt que de l'ordre d'itération de la table ABI, et faire exécuter au préchauffage un test JavaScript minimal afin de rejeter un runtime inutilisable avant le démarrage des scripts utilisateur
* `Correctif` Rejeter le runtime officiel x86_64 incompatible avant le lancement du processus lorsque Android utilise des pages supérieures à 4 KiB, après avoir isolé l'échec au plafond de 4 KiB du JavaScriptCore épinglé, en remplaçant un abort Bun déterministe par un diagnostic borné
* `Amélioration` Abaisser la configuration minimale: le payload Android officiel épinglé de Bun 1.4.0 est conservé et le plancher de prise en charge est assoupli d'Android 14 (API 34) à Android 13 (API 33), couvrant davantage d'appareils
* `Amélioration` Identifier la cause racine des échecs sur les anciennes versions: depuis Android 13 le seccomp du système autorise le raw syscall `close_range` invoqué par Bun, tandis qu'un échec sur appareil réel en API 31 prouve que les API 28 à 32 exigent de corriger Bun lui-même, un simple changement de manifest ne suffisant pas
* `Amélioration` Préparer la future prise en charge d'Android 9+: un plan de correctifs du code source de Bun rejouable avec précision (6 correctifs) est établi et les entrées de build sont verrouillées (NDK et conteneur épinglés, 22 dépendances actives d'Android release); ce travail établit une voie expérimentale séparée et ne modifie pas le runtime officiel inclus dans les paquets actuels
* `Amélioration` Renforcer les contrôles de qualité des paquets: chaque APK Debug et Release vérifie le ZIP alignment de 16 KB, le contenu ABI exact ainsi que la taille et le SHA-256 du payload Bun épinglé, et les octets du payload installé sont contrôlés sur un appareil de test Android 13
* `Amélioration` Durcir la chaîne d'approvisionnement: les octets exacts de 19 archives sources de Bun et de 17 téléchargements de toolchain sont épinglés, 181 entrées d'intégrité Cargo et 172 du registre Bun sont inventoriées, et un materializer refusant l'écrasement ainsi qu'une prévérification de build double ABI protégée par la porte `buildReady` sont ajoutés
* `Amélioration` Enrichir la bibliothèque d'exemples prêts à copier et à exécuter avec des cas commentés de fetch réseau, de fichiers dans l'espace de travail privé, de streaming stdout/stderr et de types TypeScript; ajouter une porte documentaire qui impose la directive `"bun";` en première ligne et les limites de source unique sans installation
* `Amélioration` Valider l'exécution 16 KB sur un AVD Android 16 (API 36) avec PAGE_SIZE=16384 imposé: l'APK mono-ABI `arm64-v8a` réussit les 5 tests d'instrumentation Binder via `libndk_translation`, tandis que le payload `x86_64` natif s'interrompt avec le code 134 même pour un script minimal; la prise en charge générale des pages 16 KB n'est donc pas revendiquée
* `Amélioration` Clore la partie Cargo de la chaîne d'approvisionnement expérimentale Android 9+: verrouiller et matérialiser les 181 archives crates.io (26 354 160 octets), générer une source de répertoire vérifiée par checksums et prouver que la version figée de Cargo charge tout le workspace Bun avec `--locked --offline` et un `CARGO_HOME` vide; ce résultat couvre uniquement les entrées Cargo et ne clôt pas à lui seul les autres entrées de build
* `Amélioration` Clore la partie registre Bun de cette chaîne: résoudre 172 références du lock en 125 archives npm Linux x64 uniques (31 498 870 octets), reconstruire un cache minimal depuis les tarballs verrouillés et réussir les trois installations frozen dans le conteneur Ubuntu figé, réseau désactivé et cache en lecture seule; `esbuild@0.21.5` est la seule dépendance avec un postinstall approuvé
* `Amélioration` Achever la porte de build reproductible du runtime patché sans le distribuer: verrouiller 155 archives hôte `.deb` (422 223 096 octets) dans une image OCI reproductible, étendre la clôture Cargo à 206 archives uniques, effectuer deux builds propres sans réseau des deux ABI 64 bits avec des résultats identiques octet par octet, puis verrouiller les audits ELF en Node pur; les sondes shell directes API 28 et 31 réussissent, tandis que les portes APK et processus applicatif restent ouvertes
* `Amélioration` Implémenter des assets de Release vérifiables pour les sources correspondantes: séparer les sources des APK dans le même Release; empaqueter les sources Bun/WebKit/JSC exactes, 19 archives native, 206 Cargo et 125 npm, avec patches, instructions de build/relink et avis public de licences; fractionner les gros assets à 1,9 Go, lier les octets APK/runtime/source par un manifest lisible par machine et SHA256SUMS, puis publier le draft seulement après concordance des SHA-256 GitHub; ceci atteste une vérification technique automatisée, pas une approbation juridique
* `Dépendance` Ajouter le runtime Kotlin Parcelize afin que R8 en Release conserve la classe partagée du contrat Parcelable

# v0.1.0

###### 2026/09/01

* `Note` Première version: chaque exécution traite un seul fichier de script autonome; les fonctions intégrées d'AutoJs6, le pont Java, les projets multifichiers et les imports relatifs ne sont pas encore disponibles
* `Fonctionnalité` Ajouter le moteur `bun` autonome: placez `"bun";` sur la première ligne d'un script pour exécuter JavaScript et TypeScript avec l'executable Android officiel de Bun 1.4.0; la commande réelle est `bun run --no-install <source>` et les dépendances ne sont jamais installées automatiquement
* `Fonctionnalité` Renvoyer la sortie en temps réel: stdout et stderr sont diffusés par fragments bornés via oneway Binder callback, et le résultat final ne rapporte que le statut et le diagnostic, sans le flux de sortie complet
* `Fonctionnalité` Exécution contrôlable: les scripts s'exécutent dans le processus isolé du plugin `:bun_runtime`, avec annulation explicite, timeout par défaut de 60 secondes, consultation des informations du runtime et prewarming
* `Fonctionnalité` Fournir les payloads Android 64 bits officiels pour `arm64-v8a` et baseline `x86_64`, ainsi que des paquets mono-ABI et `universal`
* `Fonctionnalité` Offrir l'expérience plugin complète: découverte du plugin, activation protégée par permission (Wake), métadonnées PluginInfo complètes et documentation utilisateur en 10 langues
* `Amélioration` Adopter un contrat Binder versionné transférant la source par ParcelFileDescriptor, avec une limite de 16 MiB pour la source et de 8 MiB pour la sortie combinée
* `Amélioration` Lancer Bun depuis le répertoire read-only de native library d'Android et vérifier la taille, le SHA-256 et les propriétés ELF des archives release épinglées et des binaires empaquetés
* `Amélioration` Vérifier que les deux executables empaquetés ont un PT_LOAD alignment d'au moins 16 KB, tout en documentant honnêtement que le test dans un environnement Android réel en 16 KB n'est pas encore achevé
* `Amélioration` Générer le README, les instructions du centre de plugins et le changelog intégré à partir de sources JSON validées, avec des contrôles CI pour le build, le Markdown et les artefacts du runtime
* `Amélioration` Fixer le minimum provisoire à Android 14 (API 34): sur un appareil réel en API 31 le syscall `close_range` de Bun est tué par seccomp avec `SIGSYS`, un appareil Sony en API 33 a réussi de façon inattendue sans prouver la portabilité, et les tests aller-retour Binder JS et TS ont réussi sur un appareil réel en API 35
