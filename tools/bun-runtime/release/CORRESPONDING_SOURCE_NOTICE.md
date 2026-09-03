# Bun Runtime source, licenses, and relinking information

AutoJs6 Plugin Bun Runtime distributes an Android executable built from the
Bun project. Bun is licensed under the MIT License. Bun statically links
JavaScriptCore and WebKit components covered by LGPL-2-family terms and also
contains third-party components under their respective licenses.

Each applicable GitHub Release publishes the APKs separately from a matching
corresponding-source asset set. The release includes:

- the exact Bun base source archive;
- the exact WebKit/JavaScriptCore source snapshot used by Bun;
- the native dependency sources, Node.js headers, and Cargo/npm source archives
  selected by the locked build;
- this repository's source, downstream patches, lock files, notices, and
  reproducible build/relink instructions; and
- a machine-readable manifest plus `SHA256SUMS` covering every published APK
  and source asset.

For the Android API 28 patched experimental profile, apply the ordered patch
series in `tools/bun-runtime/experimental/api28/patches/series.lock.json`, then
follow `tools/bun-runtime/experimental/api28/README.md`. The pinned Bun notice
also documents the upstream WebKit synchronization and local relink flow.

The release verifier checks source identities, file sizes, SHA-256 digests,
archive membership, the WebKit Git archive commit, APK-contained runtime
digests, and the one-Release asset set. These are automated technical checks;
they are not a legal opinion or a claim that a court or regulator has approved
the distribution.

The authoritative license texts are included in the project-source asset at:

- `app/src/main/assets/doc/licenses/BUN-LICENSE.md`
- `app/src/main/assets/doc/licenses/WEBKIT-JAVASCRIPTCORE-COPYING.LIB`
- `app/src/main/assets/doc/licenses/WEBKIT-WEBCORE-LICENSE-LGPL-2`
- `app/src/main/assets/doc/licenses/WEBKIT-WEBCORE-LICENSE-LGPL-2.1`
- `app/src/main/assets/doc/licenses/WEBKIT-WEBCORE-LICENSE-APPLE`
- `LICENSE` (project code, Mozilla Public License 2.0)
- `THIRD_PARTY_NOTICES.md`

Upstream references:

- Bun source and license: <https://github.com/oven-sh/bun>
- WebKit source: <https://github.com/oven-sh/WebKit>
