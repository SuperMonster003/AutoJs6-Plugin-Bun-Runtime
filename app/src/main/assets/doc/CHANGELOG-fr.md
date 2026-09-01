******

### Historique des versions

******

# v0.1.0

###### 2026/09/01

* `Note` La première version exécute un seul instantané et n'expose ni globals AutoJs6, ni pont Java, ni projet multifichier, ni imports relatifs au projet
* `Fonctionnalité` Exécuter JavaScript et TypeScript avec l'exécutable Android officiel de Bun 1.4.0 comme moteur `bun` indépendant sélectionné par `"bun";`, avec `bun run --no-install <source>` sans installation automatique des dépendances
* `Fonctionnalité` Transmettre stdout et stderr uniquement par fragments bornés via callback oneway Binder, tandis que le résultat terminal rapporte statut et diagnostic sans contenir les streams complets
* `Fonctionnalité` Prendre en charge l'annulation explicite, un timeout par défaut de 60 secondes, les informations runtime et le préchauffage dans le processus isolé `:bun_runtime`
* `Fonctionnalité` Fournir les binaires Android officiels 64 bits pour `arm64-v8a` et baseline `x86_64`, avec des paquets mono-ABI et `universal`
* `Fonctionnalité` Fournir la découverte du plugin, l'activation Wake protégée, des métadonnées PluginInfo complètes et la documentation utilisateur en 10 langues
* `Amélioration` Utiliser un contrat Binder versionné avec transport de source par ParcelFileDescriptor, limite de source de 16 MiB et limite de sortie combinée de 8 MiB
* `Amélioration` Lancer Bun depuis le répertoire natif Android en lecture seule et vérifier tailles, SHA-256, type ELF, machine et alignement des archives officielles et binaires empaquetés
* `Amélioration` Vérifier un alignement PT_LOAD d'au moins 16 KB pour les deux exécutables tout en indiquant explicitement qu'aucun test Android 16 KB réel n'a été effectué
* `Amélioration` Générer README, instructions du centre de plugins et changelog intégré depuis des JSON validés, avec contrôles CI du build, du Markdown et des artefacts runtime
* `Amélioration` Exiger Android 14 (API 34) après un `SIGSYS` app seccomp sur API 31 pour la syscall 436 `close_range` de Bun; un Sony API 33 a réussi de façon inattendue sans prouver la portabilité, tandis que les allers-retours Binder JS et TS ont réussi sur API 35 et les versions inférieures attendent un fallback upstream
