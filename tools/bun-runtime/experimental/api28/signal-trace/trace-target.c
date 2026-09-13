/* SPDX-License-Identifier: MPL-2.0 */
#define _GNU_SOURCE
#include <errno.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <signal.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <sys/epoll.h>
#include <ucontext.h>
#include <unistd.h>
static volatile sig_atomic_t received;
static void handle_user(int sig) { if (sig != SIGSYS) _exit(70); received++; }
static void handle(int sig, siginfo_t *info, void *context) {
    if (sig != SIGSYS || info->si_code != 1 /* SYS_SECCOMP */ || info->si_syscall != SYS_getpid) _exit(70);
    ((ucontext_t *)context)->uc_mcontext.gregs[REG_RAX] = -ENOSYS;
    received++;
}
int main(int argc, char **argv) {
    if (argc != 4 || strcmp(argv[1], "run") || strcmp(argv[2], "--no-install")) return 71;
    const char *mode = strrchr(argv[3], '/'); if (!mode) return 72; mode++;
    if (!strcmp(mode,"user-epoll")) {
        sigset_t blocked, empty, pending;
        sigemptyset(&blocked); sigaddset(&blocked,SIGSYS); sigemptyset(&empty);
        if (signal(SIGSYS,handle_user)==SIG_ERR || sigprocmask(SIG_BLOCK,&blocked,NULL) || raise(SIGSYS)) return 73;
        if (sigpending(&pending) || sigismember(&pending,SIGSYS)!=1 || received) return 74;
        int epfd=epoll_create1(EPOLL_CLOEXEC); struct epoll_event event;
        if (epfd<0) return 75;
        errno=0;
        if (epoll_pwait(epfd,&event,1,10,&empty)!=-1 || errno!=EINTR || received!=1) return 77;
        close(epfd);
        if (sigpending(&pending) || sigismember(&pending,SIGSYS)!=0) return 78;
        puts("TARGET_USER_EPOLL");
        return 0;
    }
    if (!strcmp(mode,"user-handled") || !strcmp(mode,"user-fatal")) {
        if (!strcmp(mode,"user-handled") && signal(SIGSYS,handle_user)==SIG_ERR) return 73;
        if (raise(SIGSYS) || received!=1) return 77;
        puts("TARGET_USER_HANDLED");
        return 0;
    }
    if (!strcmp(mode,"handled")) {
        struct sigaction action = { .sa_sigaction = handle, .sa_flags = SA_SIGINFO };
        if (sigaction(SIGSYS,&action,NULL)) return 73;
    } else if (!strcmp(mode,"fatal")) {
        sigset_t mask; sigemptyset(&mask); sigaddset(&mask,SIGSYS);
        if (sigprocmask(SIG_BLOCK,&mask,NULL)) return 74;
    } else return 75;
    struct sock_filter filters[] = {
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,nr)),
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,SYS_getpid,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_TRAP),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ALLOW),
    };
    struct sock_fprog program = { .len=4, .filter=filters };
    if (prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0) || prctl(PR_SET_SECCOMP,SECCOMP_MODE_FILTER,&program)) return 76;
    errno=0;
    if (syscall(SYS_getpid)!=-1 || errno!=ENOSYS || received!=1) return 77;
    puts("TARGET_HANDLED");
    return 0;
}
