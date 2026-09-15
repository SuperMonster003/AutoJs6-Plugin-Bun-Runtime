// SPDX-License-Identifier: MIT
#include <assert.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <initializer_list>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/resource.h>

#ifdef FAKE_SYSCALLS
static const char* mode;
static unsigned opened, readCalls, getCalls, setCalls, closed;
static unsigned position;
static bool marked256, marked70000;
static bool is(const char* name) { return !strcmp(mode, name); }
static DIR* fake_opendir(const char* path)
{
    assert(!strcmp(path, "/proc/self/fd"));
    ++opened;
    if (is("open-error") || is("open-eintr-limit") || (is("open-eintr-once") && opened == 1)) {
        errno = is("open-error") ? EACCES : EINTR;
        return nullptr;
    }
    return reinterpret_cast<DIR*>(1);
}
static int fake_dirfd(DIR* directory)
{
    assert(directory == reinterpret_cast<DIR*>(1));
    if (is("dirfd-error")) { errno = EBADF; return -1; }
    return 9;
}
static dirent* fake_readdir(DIR* directory)
{
    assert(directory == reinterpret_cast<DIR*>(1));
    ++readCalls;
    if (is("read-error") || is("read-eintr-limit") || (is("read-eintr-once") && readCalls == 1)) {
        errno = is("read-error") ? EIO : EINTR;
        return nullptr;
    }
    static dirent entry;
    const char* names[] = { ".", "..", "0", "1", "2", "3", "9", "256", "70000" };
    const char* name;
    if (is("entry-limit")) name = "256";
    else if (is("entry-exact-limit") && position < (1U << 20)) { ++position; name = "256"; }
    else if (is("invalid-name")) name = "12x";
    else if (is("overflow-name")) name = "2147483648";
    else if (is("negative-name")) name = "-1";
    else if (is("entry-exact-limit") || position == sizeof(names) / sizeof(*names)) return nullptr;
    else name = names[position++];
    strcpy(entry.d_name, name);
    return &entry;
}
static int fake_fcntl(int fd, int command, int argument)
{
    assert(fd == 256 || fd == 70000); // Low fds and the owned directory must be untouched.
    if (command == F_GETFD) {
        ++getCalls;
        if (is("get-error") || is("get-ebadf") || is("get-eintr-limit") || (is("get-eintr-once") && getCalls == 1)) {
            errno = is("get-error") ? EPERM : is("get-ebadf") ? EBADF : EINTR;
            return -1;
        }
        return is("already-marked") ? FD_CLOEXEC : 0;
    }
    assert(command == F_SETFD && argument == FD_CLOEXEC);
    ++setCalls;
    if (is("set-error") || is("set-ebadf") || is("set-eintr-limit") || (is("set-eintr-once") && setCalls == 1)) {
        errno = is("set-error") ? EPERM : is("set-ebadf") ? EBADF : EINTR;
        return -1;
    }
    (fd == 256 ? marked256 : marked70000) = true;
    return 0;
}
static int fake_closedir(DIR* directory)
{
    assert(directory == reinterpret_cast<DIR*>(1));
    ++closed;
    if (is("close-error")) { errno = EINTR; return -1; }
    return 0;
}
#define opendir fake_opendir
#define dirfd fake_dirfd
#define readdir fake_readdir
#define fcntl fake_fcntl
#define closedir fake_closedir
#endif

#include "bun-startup-cloexec.h"

#ifdef STARTUP_INTEGRATION
// glibc 2.34+ exposes CLOSE_RANGE_CLOEXEC from <unistd.h> under _GNU_SOURCE; older headers need the Linux value.
#ifndef CLOSE_RANGE_CLOEXEC
#define CLOSE_RANGE_CLOEXEC (1U << 2)
#endif
static_assert(CLOSE_RANGE_CLOEXEC == 4U, "harness expects the Linux CLOSE_RANGE_CLOEXEC value");
static ssize_t bun_close_range(unsigned first, unsigned last, unsigned flags)
{
    assert(first == 4 && last == ~0U && flags == CLOSE_RANGE_CLOEXEC);
    if (is("native-success")) return 0;
    errno = ENOSYS;
    return -1;
}
#endif

int main(int argc, char** argv)
{
    assert(argc == 2);
#ifdef FAKE_SYSCALLS
    mode = argv[1];
#ifdef STARTUP_INTEGRATION
#include "startup-callsite.inc"
    if (is("native-success")) assert(opened == 0 && closed == 0);
    else assert(closed == 1 && marked256 && marked70000);
    puts("OK startup");
    return 0;
#endif
    int expectedError = 0;
    if (is("open-error")) expectedError = EACCES;
    if (is("dirfd-error")) expectedError = EBADF;
    if (strstr(mode, "eintr-limit") || is("close-error")) expectedError = EINTR;
    if (is("read-error") || strstr(mode, "-name")) expectedError = EIO;
    if (is("get-error") || is("set-error")) expectedError = EPERM;
    if (is("entry-limit")) expectedError = E2BIG;
    const int result = bun_mark_inherited_fds_cloexec(4);
    const int actualError = errno;
    assert(result == (expectedError ? -1 : 0));
    if (expectedError) assert(actualError == expectedError);
    assert(closed == ((is("open-error") || is("open-eintr-limit")) ? 0U : 1U));
    if (is("open-eintr-limit")) assert(opened == 9);
    if (is("read-eintr-limit")) assert(readCalls == 9);
    if (is("get-eintr-limit")) assert(getCalls == 9);
    if (is("set-eintr-limit")) assert(setCalls == 9);
    if (is("entry-limit") || is("entry-exact-limit")) assert(readCalls == (1U << 20) + 1);
    if (!expectedError && !is("get-ebadf") && !is("set-ebadf") && !is("already-marked") && !is("entry-exact-limit"))
        assert(marked256 && marked70000);
    if (is("already-marked") || is("get-ebadf")) assert(setCalls == 0);
    printf("OK %s\n", mode);
#else
    if (!strcmp(argv[1], "exec-check")) {
        assert(fcntl(256, F_GETFD) == -1 && errno == EBADF);
        assert(fcntl(70000, F_GETFD) == -1 && errno == EBADF);
        assert(fcntl(3, F_GETFD) == 0);
        puts("OK real-exec");
        return 0;
    }
    assert(!strcmp(argv[1], "real"));
    int source = open("/dev/zero", O_RDONLY);
    assert(source >= 3);
    assert(dup2(source, 3) == 3);
    assert(dup2(source, 256) == 256);
    assert(dup2(source, 70000) == 70000);
    rlimit limit;
    assert(getrlimit(RLIMIT_NOFILE, &limit) == 0);
    limit.rlim_cur = 1024;
    assert(setrlimit(RLIMIT_NOFILE, &limit) == 0);
    assert(fcntl(3, F_SETFD, 0) == 0);
    int before[4];
    for (int fd = 0; fd < 4; ++fd) { before[fd] = fcntl(fd, F_GETFD); assert(before[fd] >= 0); }
    assert(fcntl(256, F_GETFD) == 0 && fcntl(70000, F_GETFD) == 0);
    assert(bun_mark_inherited_fds_cloexec(4) == 0);
    for (int fd = 0; fd < 4; ++fd) assert(fcntl(fd, F_GETFD) == before[fd]);
    for (int fd : { 256, 70000 }) {
        assert(fcntl(fd, F_GETFD) == FD_CLOEXEC);
        char byte = 1;
        assert(read(fd, &byte, 1) == 1 && byte == 0);
    }
    execl("/proc/self/exe", argv[0], "exec-check", nullptr);
    assert(false);
#endif
}
