// SPDX-License-Identifier: MIT
#include <algorithm>
#include <cerrno>
#include <climits>
#include <cstdarg>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <unistd.h>

// Linux assigns 436 on both supported 64-bit architectures; Ubuntu 20.04 headers predate it.
#ifndef SYS_close_range
#define SYS_close_range 436
#endif

static void check(bool value) { if (!value) { std::fprintf(stderr, "assertion failed (errno %d)\n", errno); std::exit(90); } }
static bool nativeFastPath = false;
static volatile unsigned nativeCalls = 0;
extern "C" ssize_t bun_close_range(unsigned first, unsigned last, unsigned flags)
{
    ++nativeCalls;
    if (nativeFastPath) return syscall(SYS_close_range, first, last, flags);
    errno = ENOSYS;
    return -1;
}

#ifdef FAKE_SYSCALLS
static const char* fault;
static unsigned openCalls, readCalls, getCalls, setCalls, closeCalls, targetCloseCalls;
static unsigned emitted;
static long fakeSyscall(long number, ...);
#define syscall fakeSyscall
#endif
#include "bun-spawn-fd.h"
#ifdef FAKE_SYSCALLS
#undef syscall
#endif

#define OS(name) OS_##name
#define OS_LINUX 1
#define CLOSE_RANGE_CLOEXEC (1U << 2)
#include "spawn-range.inc"

static int prepareChild()
{
    int current_max_fd = 3;
    [[maybe_unused]] const auto childFailed = []() { return errno; };
#include "spawn-callsite.inc"
    return 0;
}

#ifdef FAKE_SYSCALLS
static bool is(const char* value) { return std::strcmp(fault, value) == 0; }
static long fail(int error) { errno = error; return -1; }
static unsigned record(unsigned char* buffer, const char* name)
{
    unsigned length = (19 + std::strlen(name) + 1 + 7) & ~7U;
    std::memset(buffer, 0, length);
    buffer[16] = static_cast<unsigned char>(length);
    buffer[17] = static_cast<unsigned char>(length >> 8);
    std::memcpy(buffer + 19, name, std::strlen(name));
    return length;
}
static long fakeSyscall(long number, ...)
{
    va_list args;
    va_start(args, number);
    long fd = va_arg(args, long);
    if (number == SYS_close) {
        va_end(args);
        if (fd == 9) {
            ++closeCalls;
            if (is("directory-close-error") || is("read-and-close-error")) return fail(EIO);
            if (is("directory-close-eintr")) return fail(EINTR);
        } else {
            check(fd == 256 || fd == 70000);
            ++targetCloseCalls;
            if (is("target-close-error")) return fail(EIO);
            if (is("target-close-eintr")) return fail(EINTR);
            if (is("target-close-ebadf")) return fail(EBADF);
        }
        return 0;
    }
    long second = va_arg(args, long);
    long third = va_arg(args, long);
    va_end(args);
    if (number == SYS_openat) {
        check(fd == AT_FDCWD && std::strcmp(reinterpret_cast<const char*>(second), "/proc/self/fd") == 0);
        check(third == (O_RDONLY | O_DIRECTORY | O_CLOEXEC));
        ++openCalls;
        if (is("open-error") || is("integration-error")) return fail(EACCES);
        if (is("open-emfile")) return fail(EMFILE);
        if (is("open-eintr-limit") || (is("open-eintr-once") && openCalls == 1)) return fail(EINTR);
        return 9;
    }
    if (number == SYS_getdents64) {
        check(fd == 9 && third == 4096);
        auto* buffer = reinterpret_cast<unsigned char*>(second);
        ++readCalls;
        if (is("read-error") || is("read-and-close-error")) return fail(EACCES);
        if (is("read-eintr-limit") || (is("read-eintr-once") && readCalls == 1)) return fail(EINTR);
        if (is("oversized-read")) return 4097;
        if (is("empty")) return 0;
        if (is("entry-limit") || is("entry-exact-limit")) {
            unsigned target = 1048576 + (is("entry-limit") ? 1 : 0), count = 0;
            while (emitted < target && count + 24 <= 4096) { count += record(buffer + count, "."); ++emitted; }
            return count;
        }
        if (emitted++) return 0;
        unsigned count = 0;
        if (is("invalid-name")) return record(buffer, "25x");
        if (is("negative-name")) return record(buffer, "-1");
        if (is("overflow-name")) return record(buffer, "2147483648");
        if (is("empty-name")) return record(buffer, "");
        if (is("unterminated")) { record(buffer, "256"); std::memset(buffer + 19, '7', 5); return 24; }
        if (is("short-header")) { std::memset(buffer, 0, 19); return 19; }
        if (is("zero-record")) { std::memset(buffer, 0, 24); return 24; }
        if (is("short-record")) { record(buffer, "256"); buffer[16] = 16; return 24; }
        if (is("long-record")) { record(buffer, "256"); buffer[16] = 32; return 24; }
        if (is("unaligned-record")) { record(buffer, "256"); buffer[16] = 23; return 24; }
        for (const char* name : { ".", "..", "0", "1", "2", "3", "9", "256", "70000" }) count += record(buffer + count, name);
        if (is("trailing-byte")) buffer[count++] = 0;
        return count;
    }
    check(number == SYS_fcntl && (fd == 256 || fd == 70000));
    if (second == F_GETFD) {
        ++getCalls;
        if (is("get-error")) return fail(EACCES);
        if (is("get-ebadf")) return fail(EBADF);
        if (is("get-eintr-limit") || (is("get-eintr-once") && getCalls == 1)) return fail(EINTR);
        return is("already-marked") ? FD_CLOEXEC : is("preserve-flags") ? 4 : 0;
    }
    check(second == F_SETFD && third == (is("preserve-flags") ? 4 | FD_CLOEXEC : FD_CLOEXEC));
    ++setCalls;
    if (is("set-error")) return fail(EACCES);
    if (is("set-ebadf")) return fail(EBADF);
    if (is("set-eintr-limit") || (is("set-eintr-once") && setCalls == 1)) return fail(EINTR);
    return 0;
}
static void fakeCase(const char* mode)
{
    fault = mode;
    bool closeMode = std::strncmp(mode, "target-close-", 13) == 0;
    int expected = 0;
    if (is("open-error") || is("read-error") || is("read-and-close-error") || is("get-error") || is("set-error") || is("integration-error")) expected = EACCES;
    if (is("directory-close-error") || is("target-close-error") || is("invalid-name") || is("negative-name") || is("empty-name") || is("unterminated")
        || is("short-header") || is("zero-record") || is("short-record") || is("long-record") || is("unaligned-record") || is("trailing-byte") || is("oversized-read")) expected = EIO;
    if (std::strstr(mode, "eintr-limit") || is("directory-close-eintr") || is("target-close-eintr")) expected = EINTR;
    if (is("overflow-name")) expected = EOVERFLOW;
    if (is("open-emfile")) expected = EMFILE;
    if (is("entry-limit")) expected = E2BIG;
    if (is("invalid-first") || is("invalid-last")) expected = EINVAL;
    int result;
    if (is("integration-error")) {
        int child = vfork();
        if (child == 0) { int error = prepareChild(); _exit(error == EACCES ? 0 : 91); }
        check(child > 0);
        int status = -1; check(waitpid(child, &status, 0) == child && status == 0);
        check(nativeCalls == 1 && openCalls == 1 && closeCalls == 0);
        return;
    }
    if (is("native-success")) {
        nativeFastPath = true;
        // Empty range in the real kernel: no fixture fds are changed.
        result = closeRangeOrLoop(INT_MAX, INT_MAX, true);
        check(result == 0 && nativeCalls == 1 && openCalls == 0);
        return;
    }
    result = bun_spawn_fd_fallback(is("invalid-first") ? -1 : 4, is("invalid-last") ? 3 : (is("inclusive-range") ? 256 : INT_MAX), !closeMode);
    check(result == (expected ? -1 : 0));
    if (expected) check(errno == expected);
    check(closeCalls == (is("open-error") || is("open-emfile") || is("open-eintr-limit") || is("invalid-first") || is("invalid-last") ? 0U : 1U));
    if (is("success")) check(getCalls == 2 && setCalls == 2);
    if (is("inclusive-range")) check(getCalls == 1 && setCalls == 1);
    if (is("already-marked")) check(getCalls == 2 && setCalls == 0);
    if (is("get-ebadf")) check(getCalls == 2 && setCalls == 0);
    if (is("set-ebadf")) check(getCalls == 2 && setCalls == 2);
    if (closeMode) check(targetCloseCalls == (expected ? 1U : 2U));
    const unsigned calls = is("open-eintr-limit") ? openCalls : is("read-eintr-limit") ? readCalls : is("get-eintr-limit") ? getCalls : setCalls;
    if (std::strstr(mode, "eintr-limit")) check(calls == 9);
    if (is("entry-exact-limit")) check(emitted == 1048576 && readCalls == 6170);
    if (is("entry-limit")) check(emitted == 1048577 && readCalls == 6169);
}
#else
static volatile unsigned parentCanary = 0x12345678;
static void realCase(const char* mode, char* executable)
{
    if (std::strcmp(mode, "exec-check") == 0) {
        check(fcntl(3, F_GETFD) == 0);
        if (fcntl(256, F_GETFD) != -1) _exit(93);
        check(errno == EBADF);
        if (fcntl(70000, F_GETFD) != -1) _exit(94);
        check(errno == EBADF);
        _exit(0);
    }
    rlimit limits; check(getrlimit(RLIMIT_NOFILE, &limits) == 0 && limits.rlim_cur > 70000);
    int source = open("/dev/null", O_RDONLY); check(source >= 0);
    check(dup2(source, 3) == 3);
    if (source != 3) check(close(source) == 0);
    check(fcntl(3, F_DUPFD, 256) == 256);
    check(fcntl(3, F_DUPFD, 70000) == 70000);
    bool exhausted = std::strcmp(mode, "spawn-exhausted") == 0;
    if (std::strcmp(mode, "spawn-unlowered") != 0) limits.rlim_cur = exhausted ? 0 : 128;
    if (std::strcmp(mode, "spawn-hard") == 0) limits.rlim_max = 128;
    check(setrlimit(RLIMIT_NOFILE, &limits) == 0);
    if (std::strcmp(mode, "range-mark") == 0 || std::strcmp(mode, "range-close") == 0) {
        bool marking = std::strcmp(mode, "range-mark") == 0;
        check(bun_spawn_fd_fallback(256, 256, marking) == 0);
        check(fcntl(3, F_GETFD) == 0 && fcntl(70000, F_GETFD) == 0);
        check(marking ? fcntl(256, F_GETFD) == FD_CLOEXEC : (fcntl(256, F_GETFD) == -1 && errno == EBADF));
        return;
    }
    nativeFastPath = std::strcmp(mode, "spawn-native") == 0;
    char childMode[] = "exec-check";
    char* arguments[] = { executable, childMode, nullptr };
    volatile int failure = 0;
    pid_t child = vfork();
    if (child == 0) {
        int error = prepareChild();
        if (exhausted) _exit(error == EMFILE ? 0 : 95);
        if (error) { failure = error; _exit(91); }
        execv(executable, arguments);
        failure = errno;
        _exit(92);
    }
    check(child > 0 && failure == 0);
    int status = -1; check(waitpid(child, &status, 0) == child && WIFEXITED(status));
    if (WEXITSTATUS(status)) { std::fprintf(stderr, "child exit %d\n", WEXITSTATUS(status)); std::exit(90); }
    check(nativeCalls == 1 && parentCanary == 0x12345678);
    check(fcntl(3, F_GETFD) == 0 && fcntl(256, F_GETFD) == 0 && fcntl(70000, F_GETFD) == 0);
    check(close(3) == 0 && close(256) == 0 && close(70000) == 0);
}
#endif

int main(int argc, char** argv)
{
    check(argc == 2);
#ifdef FAKE_SYSCALLS
    fakeCase(argv[1]);
#else
    realCase(argv[1], argv[0]);
#endif
    std::printf("OK %s\n", argv[1]);
}
