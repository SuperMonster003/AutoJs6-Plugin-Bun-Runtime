/* First-party Bun child lifecycle supervisor. See README.md for the protocol. */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/prctl.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

enum { FAILURE = 125, EXEC_FAILURE = 126, GRACE_MILLIS = 200, POLL_MILLIS = 20 };

static long long monotonic_millis(void) {
    struct timespec now;
    if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) return -1;
    return (long long) now.tv_sec * 1000 + now.tv_nsec / 1000000;
}

static int signal_child(pid_t child, int signal_number) {
    /* Only the single-threaded parent reaps this child. Its PID cannot be
     * reused before waitpid succeeds. Never signal after a successful reap. */
    return kill(child, signal_number) == 0 || errno == ESRCH;
}

int main(int argc, char **argv) {
    if (argc < 2 || argv[1][0] != '/') {
        fputs("Bun supervisor requires an absolute executable path\n", stderr);
        return FAILURE;
    }
    /* Do not inherit an ignored SIGCHLD / SA_NOCLDWAIT from the Java launcher:
     * automatic reaping would break the owned, unreaped PID invariant. */
    struct sigaction defaults = {0};
    defaults.sa_handler = SIG_DFL;
    sigemptyset(&defaults.sa_mask);
    if (sigaction(SIGCHLD, &defaults, NULL) != 0) return FAILURE;

    const pid_t supervisor = getpid();
    const pid_t child = fork();
    if (child < 0) {
        perror("Bun supervisor fork");
        return FAILURE;
    }
    if (child == 0) {
        /* The supervisor is single-threaded. Check the fork/prctl death race
         * before exec, and retain SIGKILL across exec of the ordinary Bun PIE. */
        if (prctl(PR_SET_PDEATHSIG, SIGKILL, 0, 0, 0) != 0 || getppid() != supervisor) _exit(FAILURE);
        const int empty_input = open("/dev/null", O_RDONLY | O_CLOEXEC);
        if (empty_input < 0) _exit(FAILURE);
        if (empty_input != STDIN_FILENO) {
            if (dup2(empty_input, STDIN_FILENO) < 0) _exit(FAILURE);
            close(empty_input);
        } else if (fcntl(STDIN_FILENO, F_SETFD, 0) < 0) {
            _exit(FAILURE);
        }
        /* stdin is now EOF, NOT the private control pipe. Only stdout/stderr,
         * argv, environment and cwd are forwarded unchanged. No shell. */
        sigset_t unblocked;
        sigemptyset(&unblocked);
        if (sigprocmask(SIG_SETMASK, &unblocked, NULL) != 0) _exit(FAILURE);
        execv(argv[1], &argv[1]);
        perror("Bun supervisor exec");
        _exit(EXEC_FAILURE);
    }

    int terminating = 0;
    int killed = 0;
    long long deadline = 0;
    for (;;) {
        int status = 0;
        const pid_t waited = waitpid(child, &status, WNOHANG);
        if (waited == child) {
            if (WIFEXITED(status)) return WEXITSTATUS(status);
            if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
            return FAILURE;
        }
        if (waited < 0) {
            if (errno == EINTR) continue;
            /* ECHILD means ownership is lost: do not signal a possibly reused
             * PID. On other impossible errors, parent death still kills Bun. */
            perror("Bun supervisor waitpid");
            return FAILURE;
        }

        if (!terminating) {
            struct pollfd control = { .fd = STDIN_FILENO, .events = POLLIN };
            const int observed = poll(&control, 1, POLL_MILLIS);
            if (observed < 0 && errno == EINTR) continue;
            if (observed == 0) continue;
            /* EOF is the only request. Unexpected data or pipe errors also
             * fail closed; no script-controlled PID/command is ever parsed. */
            terminating = 1;
            const long long now = monotonic_millis();
            deadline = now < 0 ? 0 : now + GRACE_MILLIS;
            if (!signal_child(child, SIGTERM)) return FAILURE;
        }
        if (!killed) {
            const long long now = monotonic_millis();
            if (now < 0 || now >= deadline) {
                if (!signal_child(child, SIGKILL)) return FAILURE;
                killed = 1;
            }
        }
        /* Avoid repeatedly polling a hung-up pipe. Keep ownership until reap;
         * never report normal completion merely because a signal was sent. */
        (void) poll(NULL, 0, POLL_MILLIS);
    }
}
