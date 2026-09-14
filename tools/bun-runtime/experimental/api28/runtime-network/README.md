# Fixed offline TLS and IPv6 boundaries

This independent test-only suite reuses the production Binder service, supervisor,
permissions and exact shared AARs. The original eight-test Binder, 35 application
probes, four offline API modes and pressure fixtures remain unchanged.

| Order | Mode | Required observations |
| --- | --- | --- |
| 1 | tls-transport | One TLS 1.2 and one TLS 1.3 session, explicit CA and hostname authorization, exact peer certificate, SNI/ALPN, 4 KiB binary request/reversed reply and normal socket closure |
| 2 | tls-rejection | Wrong CA and wrong hostname fail before secureConnect, close without application data, then a valid connection succeeds with the exact certificate |
| 3 | https | Verified local HTTPS request, TLS 1.2 and HTTP/1.1 ALPN, exact UTF-8 body, response completion and socket/server closure |
| 4 | ipv6 | Literal `::1` TCP, UDP and HTTP/fetch exchanges, exact binary data and IPv6 peers, all owned sockets closed; unavailable IPv6 fails rather than skips |

The tests use the [Node TLS connection and identity contract](https://nodejs.org/api/tls.html#tlsconnectoptions-callback)
and [HTTPS request options](https://nodejs.org/api/https.html#httpsrequestoptions-callback).
The [Bun compatibility documentation](https://bun.sh/docs/runtime/nodejs-compat#nodetls)
lists separate TLS limitations. Current documentation guides fixture design;
it does not validate the pinned Android runtime or imply untested features work.

Every fixture is a single immutable source snapshot capped at 12 KiB, with an
8-second work watchdog, 12-second Binder timeout, 16 KiB combined output budget and
8 KiB successful JSON line. Every service binds an OS-allocated loopback port.
TLS and HTTPS bind `127.0.0.1`; the separate IPv6 mode binds `::1`. No public DNS,
network, dependency installation, system trust-store or global TLS setting is used.
CA rejection records retain the actual issuer-validation error; wrong hostname
requires `ERR_TLS_CERT_ALTNAME_INVALID`. Timeout, reset or insecure success cannot
substitute for either failure. The valid connection after both failures checks
that the server and verified path still function.

`certificates.json` contains deliberately **public test-only** EC leaf-key and
certificate bytes, including an unrelated root for rejection. They have no real
identity or external authority and must never be used outside this fixture.
Root signing keys were generated in memory and are not retained. The fixed
2000-2100 validity interval avoids dependence on issuance-day device clocks.
The verifier checks leaf/key matching, CA signatures, hostname, validity and exact
embedded material in each TLS source. This is a fixture, not a production PKI design.

The initial fixed matrix is ARM64 API 28/31/33/35 and x86_64 API 33, all with native
4096-byte application/kernel pages, exactly two rounds per environment. Commit
reviewed sources before the one new three-APK baseline batch and retain its
compiled-input receipt. Reuse the thirteen-patch baseline payloads; do not rebuild
native code or substitute the large-page JSC candidate.

Use the documented experimental Binder Gradle properties to build, then run
`../binder/run-binder.mjs` with `--suite runtime-network`, normal SDK/serial/API/ABI/
pages/new-output arguments and no `--profile`. Preserve failures in their original
new directories before diagnosis. Archive a complete fixed successful batch with:

```text
node tools/bun-runtime/experimental/api28/runtime-network/archive-network.mjs <new docs/compatibility output.json> <arm28 run> <arm31 run> <arm33 run> <arm35 run> <x86-33 run>
```

The archiver binds raw instrumentation, exact source and certificate inputs,
native payloads, installed APK hashes/signatures, both package UIDs and final raw
process/cleanup facts. Host tests execute the real TLS/HTTPS and IPv6 fixtures
with only Android identity and `/proc` substituted, and require failures when
verification is disabled or evidence is corrupted. Host results are not Android
or Bun compatibility evidence.

These finite supplementary observations keep `compatibilityAcceptance=false` and
`distributionReady=false`. They add no counts to older suites. mTLS, OCSP, PSK,
session resumption, HTTP/2, TLS over IPv6, public IPv6 routing, native 16 KiB,
broader APIs, performance/soak and signed Release acceptance remain separate.
