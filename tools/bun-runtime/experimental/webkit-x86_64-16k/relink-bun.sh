#!/usr/bin/env bash
# Diagnostic incremental build only: /work/bun must be a dedicated copy of the
# nine-patch build, never either retained clean-build evidence directory.
set -euo pipefail
export PATH=/opt/autojs6/toolchains/node-v24.3.0-linux-x64/bin:/opt/autojs6/toolchains/bun-linux-x64:/opt/autojs6/toolchains/cmake-3.30.5/bin:/opt/autojs6/toolchains/ninja-1.13.2:/opt/autojs6/toolchains/rust-nightly-2026-07-20/bin:/usr/lib/llvm-21/bin:/usr/bin:/bin
export CCACHE_DISABLE=1 CARGO_NET_OFFLINE=true PYTHONDONTWRITEBYTECODE=1
export LC_ALL=C.UTF-8 TZ=UTC SOURCE_DATE_EPOCH=1788278400
export ANDROID_NDK_ROOT=/opt/autojs6/android-ndk-r27c
test "$(git -C /work/bun rev-parse HEAD)" = 7b9ac266888abda7ee6ec0b8ac11a74236420030
test -z "$(git -C /work/bun status --porcelain --untracked-files=no)"
grep -qx '#define USE_64KB_PAGE_BLOCK 1' /largepage/cmakeconfig.h
bundle=/work/bun/build/autojs6-api28/cache/webkit-0f966e81b78c84bb-android-android
for library in libJavaScriptCore.a libWTF.a libbmalloc.a; do
    cp "/largepage/lib/$library" "$bundle/lib/$library"
done
cp /largepage/cmakeconfig.h "$bundle/include/cmakeconfig.h"
cd /work/bun
ninja -C build/autojs6-api28/x86_64 -j8
