/* SPDX-License-Identifier: MPL-2.0
 * Test-only ptrace observer. Never changes registers, masks or SIGSYS delivery.
 * It owns only its forked tracee and descendants attached by the kernel.
 * The production supervisor owns this observer; EXITKILL bounds tracer death.
 */
#define _GNU_SOURCE
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <sys/uio.h>
#if defined(__x86_64__)
#include <sys/user.h>
#endif
#include <sys/ptrace.h>
#include <sys/prctl.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

static void fail(const char *phase) {
    int saved = errno;
    fprintf(stderr, "TRACE_ERROR={\"phase\":\"%s\",\"errno\":%d}\n", phase, saved);
    exit(125); /* Attached tracees die through PTRACE_O_EXITKILL. */
}

/* A stopped tracee's registers and one signal-mask word are read only. This
 * observes the epoll delivery context without syscall stepping or mutation. */
static void observe_user_wait(pid_t leader, pid_t tid) {
    unsigned long long number, mask_address;
#if defined(__aarch64__)
    uint64_t registers[34]; /* x0-x30, sp, pc, pstate: NT_PRSTATUS */
    struct iovec vector = { registers, sizeof(registers) };
    if (ptrace(PTRACE_GETREGSET, tid, (void *)1, &vector) || vector.iov_len != sizeof(registers)) fail("user-registers");
    number = registers[8]; mask_address = registers[4];
    if (number != 22 && number != 441) return;
#elif defined(__x86_64__)
    struct user_regs_struct registers;
    struct iovec vector = { &registers, sizeof(registers) };
    if (ptrace(PTRACE_GETREGSET, tid, (void *)1, &vector) || vector.iov_len != sizeof(registers)) fail("user-registers");
    number = registers.orig_rax; mask_address = registers.r8;
    if (number != 281 && number != 441) return;
#else
#error Unsupported diagnostic ABI
#endif
    unsigned long word = 0;
    if (mask_address) {
        errno = 0;
        word = (unsigned long)ptrace(PTRACE_PEEKDATA, tid, (void *)(uintptr_t)mask_address, 0);
        if (errno) fail("wait-mask-read");
    }
    fprintf(stderr, "TRACE_USER_WAIT={\"leader\":%d,\"tid\":%d,\"syscallRegister\":%llu,\"maskAddress\":\"%016llx\",\"maskWord\":\"%016lx\",\"maskRead\":%s}\n",
        leader, tid, number, mask_address, word, mask_address ? "true" : "false");
}

/* A fatal-stop snapshot is supplementary evidence, not a reconstructed clone
 * result or proof of a resource limit. Read failures are recorded and the real
 * signal is still forwarded. Only this observer's kernel-attached tracee is read. */
static void observe_abort(pid_t leader, pid_t tid) {
    siginfo_t info;
    memset(&info, 0, sizeof(info));
    int info_error = ptrace(PTRACE_GETSIGINFO, tid, 0, &info) ? errno : 0;
    uint64_t pc = 0, sp = 0, fp = 0, lr = 0;
    int register_error = 0;
#if defined(__aarch64__)
    uint64_t registers[34] = { 0 };
    struct iovec vector = { registers, sizeof(registers) };
    if (ptrace(PTRACE_GETREGSET, tid, (void *)1, &vector)) register_error = errno;
    else if (vector.iov_len != sizeof(registers)) register_error = EIO;
    else { pc = registers[32]; sp = registers[31]; fp = registers[29]; lr = registers[30]; }
#elif defined(__x86_64__)
    struct user_regs_struct registers;
    struct iovec vector = { &registers, sizeof(registers) };
    if (ptrace(PTRACE_GETREGSET, tid, (void *)1, &vector)) register_error = errno;
    else if (vector.iov_len != sizeof(registers)) register_error = EIO;
    else { pc = registers.rip; sp = registers.rsp; fp = registers.rbp; }
#endif
    fprintf(stderr, "TRACE_ABORT={\"leader\":%d,\"tid\":%d,\"signo\":%d,\"code\":%d,\"infoError\":%d,\"registerError\":%d,\"pc\":\"%016llx\",\"sp\":\"%016llx\",\"fp\":\"%016llx\",\"lr\":\"%016llx\"}\n",
        leader, tid, SIGABRT, info.si_code, info_error, register_error,
        (unsigned long long)pc, (unsigned long long)sp, (unsigned long long)fp, (unsigned long long)lr);
    uint64_t addresses[8] = { pc, lr }; unsigned count = lr ? 2 : 1;
    while (!register_error && count < 8 && fp >= sp && fp - sp <= 1048560 && !(fp % sizeof(uint64_t))) {
        errno = 0;
        uint64_t next = (uint64_t)ptrace(PTRACE_PEEKDATA, tid, (void *)(uintptr_t)fp, 0);
        int error = errno;
        if (!error) {
            errno = 0;
            uint64_t address = (uint64_t)ptrace(PTRACE_PEEKDATA, tid, (void *)(uintptr_t)(fp + 8), 0);
            error = errno;
            if (!error && address) addresses[count++] = address;
        }
        if (error || next <= fp) break;
        fp = next;
    }
    char path[64], line[1024];
    for (unsigned index = 0; index < count && addresses[index]; index++) {
        snprintf(path, sizeof(path), "/proc/%d/maps", tid);
        FILE *maps = fopen(path, "re");
        int error = maps ? 0 : errno; unsigned rows = 0;
        unsigned long long low = 0, high = 0, offset = 0;
        char name[129] = { 0 }, permissions[5] = { 0 }; int found = 0;
        while (maps && rows++ < 4096 && fgets(line, sizeof(line), maps)) {
            name[0] = '\0';
            if (sscanf(line, "%llx-%llx %4s %llx %*s %*s %128[^\n]", &low, &high, permissions, &offset, name) >= 4 &&
                addresses[index] >= low && addresses[index] < high) { found = 1; break; }
        }
        if (maps) { if (ferror(maps)) error = EIO; fclose(maps); }
        fprintf(stderr, "TRACE_ABORT_FRAME={\"tid\":%d,\"index\":%u,\"address\":\"%016llx\",\"mapped\":%s,\"mapError\":%d,\"mapLimitReached\":%s,\"pathMayBeTruncated\":%s,\"mapStart\":\"%016llx\",\"mapOffset\":\"%016llx\",\"pathHex\":\"",
            tid, index, (unsigned long long)addresses[index], found ? "true" : "false", error,
            !found && rows > 4096 ? "true" : "false", found && strlen(name) == 128 ? "true" : "false",
            found ? low : 0, found ? offset : 0);
        if (found) for (const unsigned char *p = (unsigned char *)name; *p; p++) fprintf(stderr, "%02x", *p);
        fputs("\"}\n", stderr);
    }
    snprintf(path, sizeof(path), "/proc/%d/status", tid);
    FILE *status = fopen(path, "re");
    int status_error = status ? 0 : errno;
    long tgid = -1, uid = -1, threads = -1, rss = -1, vmsize = -1; unsigned rows = 0;
    while (status && rows++ < 128 && fgets(line, sizeof(line), status)) {
        if (sscanf(line, "Tgid: %ld", &tgid) == 1) continue;
        if (sscanf(line, "Uid: %ld", &uid) == 1) continue;
        if (sscanf(line, "Threads: %ld", &threads) == 1) continue;
        if (sscanf(line, "VmRSS: %ld", &rss) == 1) continue;
        (void)sscanf(line, "VmSize: %ld", &vmsize);
    }
    if (status) { if (ferror(status)) status_error = EIO; fclose(status); }
    snprintf(path, sizeof(path), "/proc/%d/limits", tid);
    FILE *limits = fopen(path, "re");
    int limits_error = limits ? 0 : errno; char soft[32] = "unknown", hard[32] = "unknown"; rows = 0;
    while (limits && rows++ < 64 && fgets(line, sizeof(line), limits))
        if (sscanf(line, "Max processes %31s %31s", soft, hard) == 2) break;
    if (limits) { if (ferror(limits)) limits_error = EIO; fclose(limits); }
    long available = -1;
    FILE *memory = fopen("/proc/meminfo", "re");
    int memory_error = memory ? 0 : errno; rows = 0;
    while (memory && rows++ < 128 && fgets(line, sizeof(line), memory))
        if (sscanf(line, "MemAvailable: %ld", &available) == 1) break;
    if (memory) { if (ferror(memory)) memory_error = EIO; fclose(memory); }
    fprintf(stderr, "TRACE_ABORT_RESOURCES={\"tid\":%d,\"tgid\":%ld,\"uid\":%ld,\"threads\":%ld,\"rssKb\":%ld,\"vmSizeKb\":%ld,\"statusError\":%d,\"nprocSoft\":\"%s\",\"nprocHard\":\"%s\",\"limitsError\":%d,\"memAvailableKb\":%ld,\"memoryError\":%d}\n",
        tid, tgid, uid, threads, rss, vmsize, status_error, soft, hard, limits_error, available, memory_error);
    fflush(stderr);
}

int main(int argc, char **argv) {
    if (argc != 3 || argv[1][0] != '/' || argv[2][0] != '/') return 125;
    alarm(12);
    pid_t leader = fork();
    if (leader < 0) fail("fork");
    if (leader == 0) {
        if (prctl(PR_SET_PDEATHSIG, SIGKILL) || getppid() == 1 || prctl(PR_SET_DUMPABLE, 1)) _exit(125);
        if (ptrace(PTRACE_TRACEME, 0, 0, 0)) _exit(126);
        raise(SIGSTOP);
        char *command[] = {argv[1], "run", "--no-install", argv[2], NULL};
        execv(argv[1], command);
        _exit(127);
    }
    int status;
    if (waitpid(leader, &status, 0) != leader || !WIFSTOPPED(status) || WSTOPSIG(status) != SIGSTOP) fail("initial-stop");
    unsigned long options = PTRACE_O_TRACEFORK | PTRACE_O_TRACEVFORK | PTRACE_O_TRACECLONE |
        PTRACE_O_TRACEEXEC | PTRACE_O_TRACEEXIT | PTRACE_O_EXITKILL;
    if (ptrace(PTRACE_SETOPTIONS, leader, 0, options)) fail("set-options");
    if (ptrace(PTRACE_CONT, leader, 0, 0)) fail("initial-continue");
    unsigned events = 0, signals = 0, exits = 0, aborts = 0;
    int leader_code = -1;
    for (;;) {
        pid_t tid = waitpid(-1, &status, __WALL);
        if (tid < 0) {
            if (errno == EINTR) continue;
            if (errno == ECHILD) break;
            fail("wait");
        }
        if (++events > 256) fail("event-budget");
        if (WIFEXITED(status) || WIFSIGNALED(status)) {
            exits++;
            if (tid == leader) leader_code = WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
            continue;
        }
        if (!WIFSTOPPED(status)) fail("unexpected-status");
        unsigned event = (unsigned)status >> 16;
        int sig = WSTOPSIG(status), deliver = sig;
        if (event || sig == SIGSTOP) deliver = 0; /* Kernel attach/ptrace event stops only. */
        else if (sig == SIGSYS) {
            siginfo_t info;
            if (ptrace(PTRACE_GETSIGINFO, tid, 0, &info)) fail("siginfo");
            if (++signals > 32) fail("signal-budget");
            if (info.si_code == 1 /* SYS_SECCOMP */) {
                fprintf(stderr, "TRACE_SIGSYS={\"leader\":%d,\"tid\":%d,\"signo\":%d,\"code\":%d,\"syscall\":%d,\"arch\":%u}\n",
                    leader, tid, info.si_signo, info.si_code, info.si_syscall, info.si_arch);
            } else {
                /* The siginfo union has sender identity here, not a syscall/arch. */
                fprintf(stderr, "TRACE_USER_SIGSYS={\"leader\":%d,\"tid\":%d,\"signo\":%d,\"code\":%d,\"senderPid\":%d,\"senderUid\":%u}\n",
                    leader, tid, info.si_signo, info.si_code, info.si_pid, info.si_uid);
                observe_user_wait(leader, tid);
            }
            fflush(stderr);
            /* Including fatal blocked SIGSYS: never suppress or convert it. */
        } else if (sig == SIGABRT && aborts++ < 2) observe_abort(leader, tid);
        if (ptrace(PTRACE_CONT, tid, 0, deliver) && errno != ESRCH) fail("continue");
    }
    fprintf(stderr, "TRACE_DONE={\"leader\":%d,\"exitCode\":%d,\"events\":%u,\"signals\":%u,\"exits\":%u}\n",
        leader, leader_code, events, signals, exits);
    return leader_code < 0 ? 125 : leader_code;
}
