// SPDX-License-Identifier: Apache-2.0
#define _GNU_SOURCE
#include <errno.h>
#include <limits.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <pthread.h>
#include <signal.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/eventfd.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <time.h>
#include <unistd.h>

static void check(int condition, const char *message) {
    if (!condition) { fprintf(stderr, "FAIL %s\n", message); exit(90); }
}
static volatile sig_atomic_t sys_delivered, usr_delivered, interrupted;
static int old_calls, new_calls, inject_errno, synthetic, last_ms, saw_null;
static long last_ns;
static uint64_t fake_now;
static pid_t main_tid;
static void handler(int sig) {
    if (sig == SIGSYS) ++sys_delivered;
    else if (sig == SIGUSR2) ++usr_delivered;
    else if (sig == SIGUSR1) ++interrupted;
}
static uint64_t us_internal_monotonic_ns(void) {
    if (synthetic) return fake_now;
    struct timespec ts;
    check(clock_gettime(CLOCK_MONOTONIC, &ts) == 0, "monotonic clock");
    return (uint64_t)ts.tv_sec * 1000000000ULL + (uint64_t)ts.tv_nsec;
}
static int controlled_result(void) {
    if (synthetic == 3 && old_calls + new_calls < 3) {
        fake_now += 1100000; errno = EINTR; return -1;
    }
    return 0;
}
static int observed_epoll_pwait(int fd, struct epoll_event *events, int count, int ms, const sigset_t *mask) {
    ++old_calls; last_ms = ms; saw_null = mask == NULL;
    if (synthetic) return controlled_result();
    return epoll_pwait(fd, events, count, ms, mask);
}
#define epoll_pwait observed_epoll_pwait
#define LIKELY(x) __builtin_expect(!!(x), 1)
#define IS_EINTR(ret) ((ret) == -1 && errno == EINTR)
#include "wait.inc"
#undef epoll_pwait

ssize_t sys_epoll_pwait2(int fd, struct epoll_event *events, int count, const struct timespec *ts, const sigset_t *mask) {
    ++new_calls; last_ns = ts ? ts->tv_nsec : -1; saw_null = mask == NULL;
    if (inject_errno) return -inject_errno;
    if (synthetic) { int ret = controlled_result(); return ret < 0 ? -errno : ret; }
    long ret = syscall(SYS_epoll_pwait2, fd, events, count, ts, mask, (size_t)8);
    return ret < 0 ? -errno : ret;
}

static void trap_new_wait(void) {
    struct sock_filter code[] = {
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_epoll_pwait2, 0, 1),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_TRAP),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
    };
    struct sock_fprog filter = { .len = sizeof(code)/sizeof(code[0]), .filter = code };
    check(prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) == 0, "no_new_privs");
    check(prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &filter) == 0, "test-only trap filter");
}
static sigset_t original_mask, blocked_mask;
static void pending(void) {
    sigset_t add;
    sigemptyset(&add); sigaddset(&add, SIGSYS); sigaddset(&add, SIGUSR2);
    check(pthread_sigmask(SIG_BLOCK, &add, &original_mask) == 0, "block caller signals");
    check(pthread_sigmask(SIG_BLOCK, NULL, &blocked_mask) == 0, "query caller mask");
    check(syscall(SYS_tgkill, getpid(), main_tid, SIGSYS) == 0, "queue SIGSYS");
    check(syscall(SYS_tgkill, getpid(), main_tid, SIGUSR2) == 0, "queue second caller signal");
}
static void retained(void) {
    sigset_t mask, queued;
    check(pthread_sigmask(SIG_BLOCK, NULL, &mask) == 0, "query unchanged mask");
    for (int i=1; i<NSIG; ++i)
        check(sigismember(&mask, i) == sigismember(&blocked_mask, i), "complete caller mask unchanged");
    check(sigpending(&queued) == 0, "query pending signals");
    check(sigismember(&queued, SIGSYS) == 1 && sigismember(&queued, SIGUSR2) == 1 &&
        !sys_delivered && !usr_delivered, "caller pending signals retained during wait");
}
static void restore(void) {
    check(pthread_sigmask(SIG_SETMASK, &original_mask, NULL) == 0, "caller explicitly restores mask");
    check(sys_delivered == 1 && usr_delivered == 1, "one delivery each only after caller restore");
}
struct sender { int event; int interrupt; };
static void *send_events(void *value) {
    struct sender *s = value;
    struct timespec pause = {0, 10000000};
    for (int i=0; i<(s->interrupt ? 6 : 3); ++i) {
        nanosleep(&pause, NULL);
        if (s->interrupt) check(syscall(SYS_tgkill, getpid(), main_tid, SIGUSR1) == 0, "interrupt waiter");
    }
    if (s->event >= 0) { uint64_t one=1; check(write(s->event, &one, sizeof(one)) == sizeof(one), "wake waiter"); }
    return NULL;
}
static void *independent_thread(void *value) {
    (void)value;
    sigset_t clear;
    sigemptyset(&clear);
    check(pthread_sigmask(SIG_SETMASK, &clear, NULL) == 0, "independent thread mask");
    int fd=epoll_create1(EPOLL_CLOEXEC);
    struct epoll_event event;
    struct timespec zero={0,0};
    check(fd >= 0 && bun_epoll_pwait2(fd, &event, 1, &zero) == 0, "independent unblocked wait");
    check(close(fd) == 0, "thread epoll cleanup");
    return NULL;
}
int main(int argc, char **argv) {
    check(argc == 2, "one fixed mode required");
    const char *mode = argv[1];
    alarm(6); main_tid=(pid_t)syscall(SYS_gettid);
    struct sigaction action = {.sa_handler=handler};
    sigemptyset(&action.sa_mask);
    check(sigaction(SIGSYS, &action, NULL) == 0 && sigaction(SIGUSR2, &action, NULL) == 0 &&
        sigaction(SIGUSR1, &action, NULL) == 0, "install handlers");
    int fd=epoll_create1(EPOLL_CLOEXEC);
    check(fd >= 0, "create epoll");
    struct epoll_event event;
    struct timespec timeout={0, 20000000};
    has_epoll_pwait2=0;
    if (!strncmp(mode, "pending-", 8) || !strncmp(mode, "trap-", 5)) {
        if (strstr(mode, "unknown")) has_epoll_pwait2=-1;
        if (strstr(mode, "enabled") || strstr(mode, "unblocked")) has_epoll_pwait2=1;
        int initial=has_epoll_pwait2;
        if (!strstr(mode, "unblocked")) pending();
        if (!strncmp(mode, "trap-", 5)) trap_new_wait();
        check(bun_epoll_pwait2(fd, &event, 1, &timeout) == 0, "finite wait");
        if (!strstr(mode, "unblocked")) { retained(); restore(); }
        check(new_calls == 0 && old_calls == 1 && saw_null && has_epoll_pwait2 == initial,
            "Android excludes optional probe without capability mutation");
    } else if (!strcmp(mode, "zero")) {
        pending(); timeout.tv_nsec=0;
        check(bun_epoll_pwait2(fd, &event, 1, &timeout) == 0, "zero timeout"); retained(); restore();
    } else if (!strcmp(mode, "thread-local")) {
        pending(); pthread_t thread;
        check(pthread_create(&thread, NULL, independent_thread, NULL) == 0, "create independent thread");
        check(pthread_join(thread, NULL) == 0, "join independent thread");
        retained(); restore();
    } else if (!strncmp(mode, "wake-", 5) || !strcmp(mode, "eintr") || !strcmp(mode, "linux-new-eintr") || !strcmp(mode, "linux-new-infinite")) {
        int is_linux = !strncmp(mode, "linux-", 6), interrupts = strstr(mode, "eintr") != NULL;
        if (is_linux) has_epoll_pwait2=1; else pending();
        int eventfd_value = interrupts ? -1 : eventfd(0, EFD_CLOEXEC);
        struct epoll_event entry={.events=EPOLLIN, .data.u64=42};
        if (!interrupts) check(eventfd_value >= 0 && epoll_ctl(fd, EPOLL_CTL_ADD, eventfd_value, &entry) == 0, "watch eventfd");
        struct sender sender={eventfd_value, interrupts}; pthread_t thread;
        check(pthread_create(&thread, NULL, send_events, &sender) == 0, "create sender");
        timeout.tv_nsec=interrupts ? 90000000 : 500000000;
        uint64_t start=us_internal_monotonic_ns();
        int ret=bun_epoll_pwait2(fd, &event, 1, strstr(mode, "infinite") ? NULL : &timeout);
        uint64_t elapsed=us_internal_monotonic_ns()-start;
        check(ret == (interrupts ? 0 : 1), "wait resumes after signal/event");
        if (is_linux) check(new_calls >= 1 && old_calls == 0, "real epoll_pwait2 executed without fallback");
        check(elapsed >= (interrupts ? 80000000ULL : 10000000ULL) && elapsed < 1000000000ULL, "bounded elapsed wait");
        if (interrupts) check(interrupted == 6 && old_calls+new_calls >= 2, "actual EINTR retries");
        else check(event.data.u64 == 42, "actual event returned");
        check(pthread_join(thread, NULL) == 0, "join sender");
        if (!is_linux) { retained(); restore(); }
        if (eventfd_value >= 0) check(close(eventfd_value) == 0, "event cleanup");
    } else if (!strcmp(mode, "bad-fd") || !strcmp(mode, "bad-maxevents")) {
        pending(); errno=0;
        int invalid_fd=!strcmp(mode,"bad-fd");
        check(bun_epoll_pwait2(invalid_fd ? -1 : fd, &event, invalid_fd ? 1 : 0, &timeout) == -1 &&
            errno == (invalid_fd ? EBADF : EINVAL), "libc argument error preserved"); retained(); restore();
    } else if (!strcmp(mode, "rounding") || !strcmp(mode, "saturation") || !strcmp(mode, "deadline") || !strcmp(mode, "linux-new-deadline") || !strcmp(mode, "linux-new-zero")) {
        synthetic=1;
        if (strstr(mode, "new-")) has_epoll_pwait2=1;
        timeout.tv_nsec=1;
        if (!strcmp(mode, "saturation")) timeout.tv_sec=(time_t)INT_MAX;
        if (strstr(mode, "deadline")) { synthetic=3; timeout.tv_nsec=2500000; }
        if (strstr(mode, "zero")) timeout.tv_nsec=0;
        check(bun_epoll_pwait2(fd,&event,1,&timeout) == 0, "controlled timeout result");
        if (strstr(mode,"new-deadline")) check(new_calls == 3 && last_ns == 300000, "raw EINTR remaining deadline");
        else if (strstr(mode,"new-zero")) check(new_calls == 1 && last_ns == 0, "raw zero timeout");
        else check(last_ms == (!strcmp(mode,"saturation") ? INT_MAX : 1), "ceil or saturation preserved");
        if (!strcmp(mode,"deadline")) check(old_calls == 3, "libc EINTR remaining deadline");
    } else if (!strcmp(mode,"linux-old-mask") || !strcmp(mode,"linux-new-mask")) {
        pending(); has_epoll_pwait2=strstr(mode,"new") ? 1 : 0;
        check(bun_epoll_pwait2(fd,&event,1,&timeout) == 0, "Linux wait");
        check(strstr(mode,"new") ? (new_calls >= 1 && old_calls == 0) : (old_calls >= 1 && new_calls == 0),
            "selected real Linux wait path executed");
        check(sys_delivered == 1 && usr_delivered == 1 && !saw_null, "Linux temporary empty mask preserved");
        restore();
    } else {
        const char *names[]={"linux-enosys","linux-eperm","linux-eopnotsupp","linux-eacces","linux-efault","linux-einval","linux-eio"};
        const int errors[]={ENOSYS,EPERM,EOPNOTSUPP,EACCES,EFAULT,EINVAL,EIO};
        int index=0;
        for (;index<7 && strcmp(mode,names[index]);++index) {}
        check(index<7,"known mode");
        has_epoll_pwait2=1; inject_errno=errors[index]; timeout.tv_nsec=0;
        check(bun_epoll_pwait2(fd,&event,1,&timeout) == (index<5 ? 0 : -errors[index]), "raw error translation/fallback");
        check(new_calls == 1 && old_calls == (index<5 ? 1 : 0) && has_epoll_pwait2 == (index<5 ? 0 : 1), "existing Linux sticky fallback policy");
    }
    check(close(fd) == 0, "epoll cleanup");
    printf("OK %s\n",mode);
    return 0;
}
