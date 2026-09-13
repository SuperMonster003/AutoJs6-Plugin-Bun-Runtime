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
    unsigned events = 0, signals = 0, exits = 0;
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
        }
        if (ptrace(PTRACE_CONT, tid, 0, deliver) && errno != ESRCH) fail("continue");
    }
    fprintf(stderr, "TRACE_DONE={\"leader\":%d,\"exitCode\":%d,\"events\":%u,\"signals\":%u,\"exits\":%u}\n",
        leader, leader_code, events, signals, exits);
    return leader_code < 0 ? 125 : leader_code;
}
