#!/usr/bin/env bash
# Runs inside the existing digest-locked API 28 builder, without network access.
# /webkit is the unchanged pinned source, /icu the pinned upstream Android
# x86_64 WebKit archive (only ICU is reused), /work the dedicated build output.
set -euo pipefail
export LC_ALL=C.UTF-8 TZ=UTC SOURCE_DATE_EPOCH=1788278400
export CCACHE_DISABLE=1 PYTHONDONTWRITEBYTECODE=1
export CC=/usr/lib/llvm-21/bin/clang CXX=/usr/lib/llvm-21/bin/clang++
export PATH=/opt/toolchains/cmake-3.30.5/bin:/opt/toolchains/ninja-1.13.2:/usr/lib/llvm-21/bin:/usr/bin:/bin
ndk_sysroot=/opt/ndk/toolchains/llvm/prebuilt/linux-x86_64/sysroot
mkdir -p /work/clang-resource/lib/x86_64-unknown-linux-android28
test -e /work/clang-resource/include || ln -s /usr/lib/llvm-21/lib/clang/21/include /work/clang-resource/include
ndk_rt=/opt/ndk/toolchains/llvm/prebuilt/linux-x86_64/lib/clang/18/lib/linux
test -e /work/clang-resource/lib/x86_64-unknown-linux-android28/libclang_rt.builtins.a || \
    ln -s "$ndk_rt/libclang_rt.builtins-x86_64-android.a" /work/clang-resource/lib/x86_64-unknown-linux-android28/libclang_rt.builtins.a
test -e /work/clang-resource/lib/x86_64-unknown-linux-android28/libunwind.a || \
    ln -s "$ndk_rt/x86_64/libunwind.a" /work/clang-resource/lib/x86_64-unknown-linux-android28/libunwind.a
cross="--target=x86_64-unknown-linux-android28 --sysroot=$ndk_sysroot -resource-dir=/work/clang-resource"
common="$cross -march=nehalem -mno-avx -mno-omit-leaf-frame-pointer -g1 -fno-omit-frame-pointer -ffunction-sections -fdata-sections -faddrsig -fno-unwind-tables -fno-asynchronous-unwind-tables -DU_STATIC_IMPLEMENTATION=1 -isystem /icu/include -ffile-prefix-map=/webkit/Source=vendor/WebKit/Source -ffile-prefix-map=/work/build/=."
cmake -S /webkit -B /work/build -G Ninja \
    -DCMAKE_SYSTEM_NAME=Linux -DCMAKE_SYSTEM_PROCESSOR=x86_64 \
    -DCMAKE_SYSROOT="$ndk_sysroot" -DANDROID=ON \
    -DCMAKE_C_COMPILER=/usr/lib/llvm-21/bin/clang \
    -DCMAKE_CXX_COMPILER=/usr/lib/llvm-21/bin/clang++ \
    -DCMAKE_AR=/usr/lib/llvm-21/bin/llvm-ar \
    -DCMAKE_RANLIB=/usr/lib/llvm-21/bin/llvm-ranlib \
    -DPORT=JSCOnly -DCMAKE_BUILD_TYPE=Release -DENABLE_STATIC_JSC=ON \
    -DUSE_THIN_ARCHIVES=OFF -DUSE_BUN_JSC_ADDITIONS=ON -DUSE_BUN_EVENT_LOOP=ON \
    -DENABLE_BUN_SKIP_FAILING_ASSERTIONS=ON \
    -DUSE_64KB_PAGE_BLOCK=ON -DENABLE_JIT=ON -DENABLE_DFG_JIT=ON -DENABLE_FTL_JIT=ON \
    -DENABLE_C_LOOP=OFF -DENABLE_SAMPLING_PROFILER=ON \
    -DENABLE_WEBASSEMBLY=ON -DENABLE_WEBASSEMBLY_BBQJIT=ON -DENABLE_WEBASSEMBLY_OMGJIT=ON \
    -DUSE_MIMALLOC=ON -DUSE_EXTERNAL_MIMALLOC=ON -DUSE_SYSTEM_MALLOC=OFF -DUSE_ISO_MALLOC=ON \
    -DENABLE_API_TESTS=OFF -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
    -DALLOW_LINE_AND_COLUMN_NUMBER_IN_BUILTINS=ON -DENABLE_REMOTE_INSPECTOR=ON \
    -DCMAKE_EXE_LINKER_FLAGS="$cross --rtlib=compiler-rt -fuse-ld=lld -Wl,-z,max-page-size=16384" \
    -DCMAKE_C_FLAGS="$common" \
    -DCMAKE_CXX_FLAGS="$common -isystem $ndk_sysroot/usr/include/c++/v1 -fno-c++-static-destructors" \
    -DICU_ROOT=/icu -DICU_INCLUDE_DIR=/icu/include \
    -DCMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH \
    -DCMAKE_FIND_ROOT_PATH_MODE_LIBRARY=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_INCLUDE=BOTH
# The standalone jsc executable cannot link Bun's external mimalloc. Build the
# same static libraries that Bun consumes; final validation runs the Bun APK.
cmake --build /work/build --target JavaScriptCore WTF bmalloc --parallel 8
