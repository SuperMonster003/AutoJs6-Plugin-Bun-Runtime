// SPDX-License-Identifier: MIT
#define _GNU_SOURCE 1
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <initializer_list>
#include <pthread.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <unistd.h>

#define OS(name) TARGET_##name
#ifndef SYS_close_range
#define SYS_close_range 436
#endif
#ifndef CLOSE_RANGE_CLOEXEC
#define CLOSE_RANGE_CLOEXEC (1U << 2)
#endif
#if OS(LINUX)
static struct { int sigThreadSuspendResume; } g_wtfConfig { SIGUSR2 };
#endif
static const char* mode;
static int directory = -1, opened = 0, closed = 0, attempts = 0, rangeCalls = 0;
static bool is(const char* value) { return strcmp(mode, value) == 0; }
[[noreturn]] static void fail(const char* message)
{
    dprintf(2, "FAIL %s\n", message);
    _exit(90);
}
static void require(bool value, const char* message) { if (!value) fail(message); }
static void handler(int) { }

// Only the helper's raw syscall boundary is injected. All normal descriptor
// operations, signals and the final exec below are real host-kernel operations.
[[maybe_unused]] static long helper_syscall(long number, long a, long b = 0, long c = 0, long d = 0)
{
    if (number == SYS_openat) {
        require(strcmp(reinterpret_cast<const char*>(b), "/proc/self/fd") == 0, "owned proc directory");
        ++attempts;
        if (is("open-error")) { errno = EACCES; return -1; }
        if (is("eintr-exhausted")) { errno = EINTR; return -1; }
        long result = syscall(number, a, b, c, d);
        if (result >= 0) { directory = static_cast<int>(result); ++opened; }
        return result;
    }
    if (number == SYS_getdents64 && is("read-error")) { errno = EIO; return -1; }
    if (number == SYS_fcntl && a == 256 &&
        ((b == F_GETFD && is("get-error")) || (b == F_SETFD && is("set-error")))) {
        errno = EIO; return -1;
    }
    if (number == SYS_close) {
        require(a == directory, "reload must never close another thread's live fd");
        ++closed;
        long result = syscall(number, a);
        if (is("close-error")) { errno = EIO; return -1; }
        return result;
    }
    return syscall(number, a, b, c, d);
}
#define syscall helper_syscall
#include "bun-spawn-fd.h"
#undef syscall

[[maybe_unused]] static ssize_t bun_close_range(unsigned first, unsigned last, unsigned flags)
{
    ++rangeCalls;
    require(first == 3 && last == ~0U && flags == CLOSE_RANGE_CLOEXEC, "range arguments");
    if (is("native")) {
        long result = syscall(SYS_close_range, first, last, flags);
        require(result == 0, "native close_range required, no fallback or skip");
        return result;
    }
    errno = is("einval") ? EINVAL : is("eio") ? EIO : ENOSYS;
    return -1;
}
[[maybe_unused, noreturn]] static void checked_exit(int status)
{
    require(status == 1, "bounded setup exit");
    require(opened == closed, "owned enumeration directory cleanup");
    require(attempts == (is("eintr-exhausted") ? 9 : 1), "bounded open retries");
    struct sigaction action {};
    sigaction(SIGUSR1, nullptr, &action);
    require(action.sa_handler == handler, "failure precedes signal reset");
    sigset_t mask;
    sigprocmask(SIG_SETMASK, nullptr, &mask);
    require(sigismember(&mask, SIGUSR1) == 1, "failure precedes mask clearing");
    for (int fd : {3, 256, 257, 70000})
        require(fcntl(fd, F_GETFD) >= 0, "failure retains live descriptors");
    _exit(status);
}
#define _exit checked_exit
#include "reload.inc"
#undef _exit

static int ipc_fd()
{
    if (is("ipc3")) return 3;
    if (is("ipc256")) return 256;
    if (is("ipc70000")) return 70000;
    return -1;
}
static void validate_stdio()
{
    for (int fd : {0, 1, 2}) require(fcntl(fd, F_GETFD) == 0, "stdio survives without CLOEXEC");
}
static void* reload_thread(void*)
{
    on_before_reload_process_posix();
    return nullptr;
}
int main(int argc, char** argv)
{
    require(argc == 2 || argc == 3, "fixed arguments");
    mode = argv[1];
    if (argc == 3) {
        validate_stdio();
        for (int fd : {3, 256, 257, 70000}) {
            if (fd == ipc_fd()) {
                char value = 0;
                require(fcntl(fd, F_GETFD) == 0 && pread(fd, &value, 1, 0) == 1 && value == 'x', "explicit IPC survives exec");
            } else require(fcntl(fd, F_GETFD) == -1 && errno == EBADF, "unlisted descriptors absent after exec");
        }
        struct rlimit limit;
        require(getrlimit(RLIMIT_NOFILE, &limit) == 0 && limit.rlim_cur == 128 && limit.rlim_max == 128, "hard limit retained across exec");
        printf("OK %s\n", mode);
        return 0;
    }
    int source = memfd_create("reload-fd-test", MFD_CLOEXEC);
    require(source >= 3 && write(source, "x", 1) == 1, "owned sentinel");
    for (int fd : {3, 256, 257, 70000}) {
        require(dup2(source, fd) == fd, "high descriptor setup required");
        require(fcntl(fd, F_SETFD, fd == 257 ? FD_CLOEXEC : 0) == 0, "descriptor initial flags");
    }
    if (source != 3 && source != 256 && source != 257 && source != 70000) close(source);
    for (int fd : {0, 1, 2}) require(fcntl(fd, F_SETFD, FD_CLOEXEC) == 0, "stdio initial flags");
    unsetenv("NODE_CHANNEL_FD");
    if (ipc_fd() >= 0) {
        char number[16]; snprintf(number, sizeof(number), "%d", ipc_fd());
        setenv("NODE_CHANNEL_FD", number, 1);
    } else if (is("ipc-invalid")) setenv("NODE_CHANNEL_FD", "256junk", 1);
    else if (is("ipc-overflow")) setenv("NODE_CHANNEL_FD", "9999999999999999999999999999", 1);
    else if (is("ipc-negative")) setenv("NODE_CHANNEL_FD", "-256", 1);
    else if (is("ipc-stdio")) setenv("NODE_CHANNEL_FD", "1", 1);
    struct rlimit limit {128, 128};
    require(setrlimit(RLIMIT_NOFILE, &limit) == 0, "lower both limits below retained fds");
    struct rlimit restore {1048576, 1048576};
    require(setrlimit(RLIMIT_NOFILE, &restore) == -1 && errno == EPERM, "hard-limit restoration denied");
    signal(SIGUSR1, handler);
    signal(SIGUSR2, handler);
    signal(SIGSYS, handler);
    signal(SIGPIPE, SIG_IGN);
    sigset_t mask;
    sigemptyset(&mask); sigaddset(&mask, SIGUSR1);
    require(pthread_sigmask(SIG_BLOCK, &mask, nullptr) == 0, "caller mask setup");
    if (is("thread-reload")) {
        pthread_t thread;
        require(pthread_create(&thread, nullptr, reload_thread, nullptr) == 0 && pthread_join(thread, nullptr) == 0, "reload from another thread");
    } else on_before_reload_process_posix();
    validate_stdio();
    if (is("policy")) {
#if OS(FREEBSD)
        require(rangeCalls == 1, "unchanged FreeBSD call");
#else
        require(rangeCalls == 0, "unchanged Darwin absence");
#endif
        require(opened == 0, "no Linux fallback outside Linux");
        require(fcntl(256, F_GETFD) == 0, "unchanged non-Linux policy");
        printf("OK policy\n"); return 0;
    }
    for (int fd : {3, 256, 257, 70000})
        require(fcntl(fd, F_GETFD) == (fd == ipc_fd() ? 0 : FD_CLOEXEC), "reload descriptor marking");
    require(opened == closed && opened == (is("native") ? 0 : 1), "fallback only on failed fast path");
    struct sigaction action {};
    sigaction(SIGUSR1, nullptr, &action); require(action.sa_handler == SIG_DFL, "caught signal reset");
    sigaction(SIGUSR2, nullptr, &action); require(action.sa_handler == handler, "JSC suspend signal retained");
    sigaction(SIGSYS, nullptr, &action); require(action.sa_handler == handler, "SIGSYS retained until exec");
    sigaction(SIGPIPE, nullptr, &action); require(action.sa_handler == SIG_IGN, "ignored signal retained");
    char* next[] = {argv[0], argv[1], const_cast<char*>("after"), nullptr};
    execv(argv[0], next);
    fail("exec must succeed");
}
