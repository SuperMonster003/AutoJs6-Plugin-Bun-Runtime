// SPDX-License-Identifier: MIT
// Linux host controls for the complete locked Android posix_spawn_bun source.
#define _GNU_SOURCE 1
#include <algorithm>
#include <atomic>
#include <cerrno>
#include <climits>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <linux/audit.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <signal.h>
#include <stddef.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <thread>
#include <ucontext.h>
#include <unistd.h>

static pid_t owner;
static int failure_mode, parent_mask_calls, child_mask_calls;
static volatile sig_atomic_t user_signals, close_traps, clone_traps;
static int controlled_sigprocmask(int how, const sigset_t* set, sigset_t* old)
{
    if (getpid() == owner) {
        if (++parent_mask_calls == 1 && failure_mode == 1) { errno = EIO; return -1; }
    } else {
        ++child_mask_calls;
        if (child_mask_calls == 1 && failure_mode == 2) { errno = EPERM; return -1; }
        if (child_mask_calls == 2 && failure_mode == 3) { errno = EINVAL; return -1; }
    }
    return sigprocmask(how, set, old);
}

#define sigprocmask controlled_sigprocmask
#include "spawn.inc"
#undef sigprocmask

static void require(bool value, const char* message)
{
    if (!value) { fprintf(stderr, "FAIL %s errno=%d\n", message, errno); exit(90); }
}
static uint64_t mask_bits()
{
    sigset_t value;
    require(sigprocmask(SIG_BLOCK, nullptr, &value) == 0, "query mask");
    uint64_t result = 0;
    for (int i = 1; i < NSIG; ++i) if (sigismember(&value, i) == 1) result |= UINT64_C(1) << (i - 1);
    return result;
}
static bool pending_sigsys()
{
    sigset_t pending;
    require(sigpending(&pending) == 0, "query pending");
    return sigismember(&pending, SIGSYS) == 1;
}
static void handler(int signal, siginfo_t* info, void* context)
{
    if (signal != SIGSYS) _exit(70);
    if (info->si_code == 1) {
        if (info->si_syscall == 436) ++close_traps;
        else if (info->si_syscall == 435) ++clone_traps;
        else _exit(71);
        static_cast<ucontext_t*>(context)->uc_mcontext.gregs[REG_RAX] = -ENOSYS;
    } else {
        if (info->si_code != SI_TKILL || info->si_pid != owner || getpid() != owner || syscall(SYS_gettid) != owner) _exit(72);
        ++user_signals;
    }
}
extern "C" ssize_t bun_close_range(unsigned int first, unsigned int last, unsigned int flags)
{
    return syscall(436, first, last, flags);
}
static void install_traps()
{
    sock_filter instructions[] = {
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(seccomp_data, arch)),
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AUDIT_ARCH_X86_64, 1, 0),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(seccomp_data, nr)),
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, 436, 1, 0),
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, 435, 0, 1),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_TRAP),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
    };
    sock_fprog program = { static_cast<unsigned short>(sizeof(instructions) / sizeof(instructions[0])), instructions };
    require(prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) == 0, "no new privileges");
    require(prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &program) == 0, "install trap controls");
}

int main(int argc, char** argv)
{
    if (argc == 4 && !strcmp(argv[1], "--child")) {
        require(mask_bits() == strtoull(argv[2], nullptr, 16), "exec child exact mask");
        require(!pending_sigsys(), "exec child does not inherit pending SIGSYS");
        require(fcntl(1, F_GETFD) >= 0, "positive child stdout descriptor");
        errno = 0;
        require(fcntl(atoi(argv[3]), F_GETFD) == -1 && errno == EBADF, "sentinel closed on exec");
        struct sigaction action;
        require(sigaction(SIGSYS, nullptr, &action) == 0 && action.sa_handler == SIG_DFL, "exec child default SIGSYS disposition");
        return 0;
    }
    require(argc == 2, "fixed host mode");
    const char* mode = argv[1];
    bool unblocked = !strcmp(mode, "unblocked-trap") || !strcmp(mode, "unblocked-cgroup-trap");
    bool queued = !strncmp(mode, "pending-", 8) || !strncmp(mode, "mask-", 5) || !strcmp(mode, "exec-error");
    bool cgroup = strstr(mode, "cgroup") != nullptr;
    bool traps = strstr(mode, "trap") != nullptr || cgroup || !strcmp(mode, "mask-child-restore-error");
    bool threaded = !strcmp(mode, "pending-threaded");
    bool after_unblock = !strcmp(mode, "pending-cgroup-then-unblocked");
    if (!strcmp(mode, "mask-parent-error")) failure_mode = 1;
    if (!strcmp(mode, "mask-child-setup-error")) failure_mode = 2;
    if (!strcmp(mode, "mask-child-restore-error")) failure_mode = 3;
    owner = getpid();
    require(syscall(SYS_gettid) == owner, "main thread control");
    sigset_t initial;
    require(sigprocmask(SIG_BLOCK, nullptr, &initial) == 0 && sigismember(&initial, SIGSYS) == 0, "initial unblocked SIGSYS");
    struct sigaction action = {};
    action.sa_sigaction = handler; action.sa_flags = SA_SIGINFO | SA_RESTART;
    require(sigemptyset(&action.sa_mask) == 0 && sigaction(SIGSYS, &action, nullptr) == 0, "install test handler");
    std::atomic<bool> ready { false }, done { false };
    std::thread other;
    if (threaded) {
        other = std::thread([&]() {
            sigset_t bit;
            sigemptyset(&bit); sigaddset(&bit, SIGUSR2);
            require(sigprocmask(SIG_BLOCK, &bit, nullptr) == 0, "other thread setup");
            uint64_t before = mask_bits();
            ready.store(true, std::memory_order_release);
            while (!done.load(std::memory_order_acquire)) usleep(1000);
            require(mask_bits() == before && !pending_sigsys(), "other thread unchanged");
        });
        while (!ready.load(std::memory_order_acquire)) usleep(1000);
    }
    if (traps) install_traps();
    sigset_t add;
    sigemptyset(&add); sigaddset(&add, SIGUSR1);
    if (!unblocked) sigaddset(&add, SIGSYS);
    require(sigprocmask(SIG_BLOCK, &add, nullptr) == 0, "caller mask setup");
    uint64_t before = mask_bits();
    if (queued) {
        require(syscall(SYS_tgkill, owner, owner, SIGSYS) == 0 && pending_sigsys(), "queue exact-thread SIGSYS");
    }
    int original = open("/dev/null", O_RDONLY);
    require(original >= 0, "open sentinel");
    int sentinel = fcntl(original, F_DUPFD, 256);
    close(original);
    require(sentinel >= 256 && sentinel < 512 && fcntl(sentinel, F_GETFD) == 0, "non-CLOEXEC sentinel");
    char directory[] = "/tmp/bun-pending-cgroup-XXXXXX";
    char procs_path[256] = {};
    int cgroup_fd = -1;
    if (cgroup) {
        require(mkdtemp(directory), "synthetic cgroup directory");
        snprintf(procs_path, sizeof(procs_path), "%s/cgroup.procs", directory);
        int fd = open(procs_path, O_CREAT | O_EXCL | O_WRONLY, 0600);
        require(fd >= 0, "synthetic cgroup procs"); close(fd);
        cgroup_fd = open(directory, O_RDONLY | O_DIRECTORY | O_CLOEXEC);
        require(cgroup_fd >= 0, "synthetic cgroup fd");
        if (!strcmp(mode, "pending-cgroup-error")) { close(cgroup_fd); cgroup_fd = INT_MAX; }
    }
    bun_spawn_request_file_action_t actions[3] = {};
    for (int i = 0; i < 3; ++i) { actions[i].type = FileActionType::Dup2; actions[i].fds[0] = actions[i].fds[1] = i; }
    bun_spawn_request_t request = {};
    request.actions = { actions, 3 }; request.pty_slave_fd = -1; request.cgroup_fd = cgroup_fd;
    char mask_text[32], fd_text[32];
    snprintf(fd_text, sizeof(fd_text), "%d", sentinel);
    int repeats = threaded ? 3 : !strcmp(mode, "unblocked-cgroup-trap") || after_unblock ? 2 : 1;
    for (int index = 0; index < repeats; ++index) {
        if (index == 1 && after_unblock) {
            sigset_t one; sigemptyset(&one); sigaddset(&one, SIGSYS);
            require(sigprocmask(SIG_UNBLOCK, &one, nullptr) == 0, "explicit post-spawn unblock");
            require(user_signals == 1 && !pending_sigsys(), "single requested user delivery");
            queued = false; unblocked = true; before = mask_bits();
        }
        snprintf(mask_text, sizeof(mask_text), "%llx", static_cast<unsigned long long>(before));
        char* child_argv[] = { argv[0], const_cast<char*>("--child"), mask_text, fd_text, nullptr };
        int pid = -123;
        child_mask_calls = 0;
        ssize_t result = posix_spawn_bun(&pid, !strcmp(mode, "exec-error") ? "/missing-fixed-bun-pending-mask-child" : argv[0], &request, child_argv, nullptr);
        bool mask_ok = mask_bits() == before;
        bool pending_ok = pending_sigsys() == queued && user_signals == (after_unblock && index == 1 ? 1 : 0);
        bool sentinel_ok = fcntl(sentinel, F_GETFD) == 0;
        ssize_t expected = failure_mode == 1 ? EIO : failure_mode == 2 ? EPERM : failure_mode == 3 ? EINVAL :
            !strcmp(mode, "exec-error") ? ENOENT : !strcmp(mode, "pending-cgroup-error") ? -EBADF : 0;
        if (pid > 1) {
            int status = 0;
            require(waitpid(pid, &status, 0) == pid && WIFEXITED(status) && WEXITSTATUS(status) == 0, "owned child exited and reaped");
        }
        errno = 0;
        require(waitpid(-1, nullptr, WNOHANG) == -1 && errno == ECHILD, "no unowned child remains");
        require(mask_ok, "parent exact mask restored");
        require(pending_ok, "parent pending signal retained across spawn");
        require(sentinel_ok, "parent sentinel unchanged");
        require(result == expected, "exact controlled spawn result");
        require(expected ? pid == -123 : pid > 1, "only a successful spawn publishes pid");
    }
    if (cgroup) {
        require(clone_traps == (unblocked ? 1 : 0), "parent clone3 skipped only while blocked; no false sticky state");
        if (cgroup_fd != INT_MAX) {
            int fd = open(procs_path, O_RDONLY); char byte = 0;
            require(fd >= 0 && read(fd, &byte, 1) == 1 && byte == '0', "existing child join path used");
            close(fd); close(cgroup_fd);
        }
        require(unlink(procs_path) == 0 && rmdir(directory) == 0, "synthetic cgroup cleanup");
    }
    if (traps && failure_mode != 1 && failure_mode != 2 && strcmp(mode, "pending-cgroup-error"))
        require(close_traps == repeats, "child SIGSYS handler handles each close_range TRAP");
    require(sigprocmask(SIG_SETMASK, &initial, nullptr) == 0, "restore original test mask");
    require(!pending_sigsys() && user_signals == (queued || after_unblock ? 1 : 0), "exactly one delivery after requested restoration");
    close(sentinel);
    if (threaded) { done.store(true, std::memory_order_release); other.join(); }
    printf("OK %s\n", mode);
    return 0;
}
