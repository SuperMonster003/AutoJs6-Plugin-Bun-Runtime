#!/bin/sh
set -eu

expected_package_count="$1"
expected_manifest_sha256="$2"

case "$expected_package_count" in
  ''|*[!0-9]*)
    echo "Invalid expected package count" >&2
    exit 1
    ;;
esac
case "$expected_manifest_sha256" in
  *[!0-9a-f]*|'')
    echo "Invalid expected package-manifest SHA-256" >&2
    exit 1
    ;;
esac
[ "${#expected_manifest_sha256}" -eq 64 ] || {
  echo "Invalid expected package-manifest SHA-256 length" >&2
  exit 1
}

export DEBIAN_FRONTEND=noninteractive
export TZ=Etc/UTC
export PYTHONHASHSEED=0

first_unpack_log=/tmp/autojs6-host-package-unpack-1.log
first_configure_log=/tmp/autojs6-host-package-configure-1.log
second_unpack_log=/tmp/autojs6-host-package-unpack-2.log
second_configure_log=/tmp/autojs6-host-package-configure-2.log
third_unpack_log=/tmp/autojs6-host-package-unpack-3.log
third_configure_log=/tmp/autojs6-host-package-configure-3.log
audit_log=/tmp/autojs6-host-package-audit.log
manifest=/tmp/autojs6-host-package-final.tsv

first_status=0
dpkg --unpack /host-debs/*.deb >"$first_unpack_log" 2>&1 || first_status=$?
[ "$first_status" -ne 0 ] || {
  echo "The first host-package unpack unexpectedly had no deferred Pre-Depends" >&2
  exit 1
}
[ "$(grep -c '^dpkg: error processing archive ' "$first_unpack_log")" -eq 3 ] || {
  echo "The first host-package unpack did not have exactly three expected deferred archives" >&2
  tail -80 "$first_unpack_log" >&2
  exit 1
}
for deferred_archive in \
  /host-debs/gawk_*.deb \
  /host-debs/python3-minimal_*.deb \
  /host-debs/python3_[0-9]*.deb
do
  grep -F " $deferred_archive" "$first_unpack_log" >/dev/null || {
    echo "Expected deferred archive was not reported: $deferred_archive" >&2
    exit 1
  }
done

dpkg --configure -a >"$first_configure_log" 2>&1
dpkg --unpack \
  /host-debs/gawk_*.deb \
  /host-debs/python3-minimal_*.deb \
  >"$second_unpack_log" 2>&1
dpkg --configure -a >"$second_configure_log" 2>&1
dpkg --unpack /host-debs/python3_[0-9]*.deb >"$third_unpack_log" 2>&1
dpkg --configure -a >"$third_configure_log" 2>&1
python3.8 /usr/local/lib/autojs6/normalize-host-python-bytecode.py

dpkg --audit >"$audit_log"
[ ! -s "$audit_log" ] || {
  echo "The offline host-package installation left dpkg audit findings" >&2
  cat "$audit_log" >&2
  exit 1
}

dpkg-query -W | LC_ALL=C sort >"$manifest"
actual_package_count="$(wc -l <"$manifest" | tr -d ' ')"
actual_manifest_sha256="$(sha256sum "$manifest" | cut -d ' ' -f 1)"
[ "$actual_package_count" = "$expected_package_count" ] || {
  echo "Expected $expected_package_count installed packages, found $actual_package_count" >&2
  exit 1
}
[ "$actual_manifest_sha256" = "$expected_manifest_sha256" ] || {
  echo "Expected package manifest $expected_manifest_sha256, found $actual_manifest_sha256" >&2
  exit 1
}

ndk_runtime=/opt/autojs6/android-ndk-r27c/toolchains/llvm/prebuilt/linux-x86_64/lib/clang/18/lib/linux
llvm_runtime=/usr/lib/llvm-21/lib/clang/21/lib
mkdir -p \
  "$llvm_runtime/aarch64-unknown-linux-android28" \
  "$llvm_runtime/x86_64-unknown-linux-android28" \
  "$llvm_runtime/linux/aarch64" \
  "$llvm_runtime/linux/x86_64"
ln -s "$ndk_runtime/libclang_rt.builtins-aarch64-android.a" "$llvm_runtime/aarch64-unknown-linux-android28/libclang_rt.builtins.a"
ln -s "$ndk_runtime/aarch64/libunwind.a" "$llvm_runtime/aarch64-unknown-linux-android28/libunwind.a"
ln -s "$ndk_runtime/libclang_rt.builtins-x86_64-android.a" "$llvm_runtime/x86_64-unknown-linux-android28/libclang_rt.builtins.a"
ln -s "$ndk_runtime/x86_64/libunwind.a" "$llvm_runtime/x86_64-unknown-linux-android28/libunwind.a"
ln -s "$ndk_runtime/libclang_rt.builtins-aarch64-android.a" "$llvm_runtime/linux/libclang_rt.builtins-aarch64-android.a"
ln -s "$ndk_runtime/libclang_rt.builtins-x86_64-android.a" "$llvm_runtime/linux/libclang_rt.builtins-x86_64-android.a"
ln -s "$ndk_runtime/aarch64/libunwind.a" "$llvm_runtime/linux/aarch64/libunwind.a"
ln -s "$ndk_runtime/x86_64/libunwind.a" "$llvm_runtime/linux/x86_64/libunwind.a"

rm -f \
  /var/cache/ldconfig/aux-cache \
  /var/log/alternatives.log \
  /var/log/dpkg.log
