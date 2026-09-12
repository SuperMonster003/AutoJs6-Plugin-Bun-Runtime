// SPDX-License-Identifier: MPL-2.0
// The Android function is extracted unchanged into production.inc.
use std::sync::atomic::{AtomicI32, Ordering::SeqCst};
static QUERY_ERROR: AtomicI32 = AtomicI32::new(0);
static MEMBER_ERROR: AtomicI32 = AtomicI32::new(0);
static CALL_ERROR: AtomicI32 = AtomicI32::new(0);
static CALLS: AtomicI32 = AtomicI32::new(0);
static REAL_CALL: AtomicI32 = AtomicI32::new(0);
static DELIVERED: AtomicI32 = AtomicI32::new(0);

mod libc {
    pub use real_libc::*;
    pub unsafe fn pthread_sigmask(how: c_int, set: *const sigset_t, old: *mut sigset_t) -> c_int {
        assert!(set.is_null(), "production must never change the mask");
        let error = super::QUERY_ERROR.load(super::SeqCst);
        if error != 0 { return error; }
        real_libc::pthread_sigmask(how, set, old)
    }
    pub unsafe fn sigismember(set: *const sigset_t, signal: c_int) -> c_int {
        if super::MEMBER_ERROR.load(super::SeqCst) != 0 { return -1; }
        real_libc::sigismember(set, signal)
    }
    pub unsafe fn syscall(number: c_long, pid: i32, flags: u32) -> c_long {
        assert_eq!(number, 434);
        super::CALLS.fetch_add(1, super::SeqCst);
        if super::REAL_CALL.load(super::SeqCst) != 0 { return real_libc::syscall(number, pid, flags); }
        let error = super::CALL_ERROR.load(super::SeqCst);
        if error != 0 { *real_libc::__errno_location() = error; return -1; }
        57
    }
}
#[derive(Debug, PartialEq)]
pub(crate) struct Fd(i32);
impl Fd { fn from_native(fd: i32) -> Self { Self(fd) } }
fn errno() -> i32 { unsafe { *real_libc::__errno_location() } }
include!("production.inc");

fn mask() -> real_libc::sigset_t {
    let mut value = std::mem::MaybeUninit::uninit();
    assert_eq!(unsafe { real_libc::pthread_sigmask(real_libc::SIG_BLOCK, std::ptr::null(), value.as_mut_ptr()) }, 0);
    unsafe { value.assume_init() }
}
fn membership(value: &real_libc::sigset_t) -> Vec<i32> {
    (1..=64).map(|sig| unsafe { real_libc::sigismember(value, sig) }).collect()
}
fn block(sig: i32, how: i32) {
    let mut value = unsafe { std::mem::zeroed() };
    assert_eq!(unsafe { real_libc::sigemptyset(&mut value) }, 0);
    assert_eq!(unsafe { real_libc::sigaddset(&mut value, sig) }, 0);
    assert_eq!(unsafe { real_libc::pthread_sigmask(how, &value, std::ptr::null_mut()) }, 0);
}
extern "C" fn delivered(_: i32) { DELIVERED.fetch_add(1, SeqCst); }
fn pending() -> bool {
    let mut value = unsafe { std::mem::zeroed() };
    assert_eq!(unsafe { real_libc::sigpending(&mut value) }, 0);
    unsafe { real_libc::sigismember(&value, real_libc::SIGSYS) == 1 }
}
fn main() {
    let case = std::env::args().nth(1).unwrap();
    let pid = unsafe { real_libc::getpid() };
    block(real_libc::SIGSYS, real_libc::SIG_UNBLOCK);
    // An unrelated blocked signal must survive every production call too.
    block(real_libc::SIGUSR1, real_libc::SIG_BLOCK);
    let unblocked = membership(&mask());
    match case.as_str() {
        "unblocked" => { assert_eq!(pidfd_open(pid, 0), Ok(Fd(57))); assert_eq!(CALLS.load(SeqCst), 1); }
        "blocked" | "pending" | "trap-skipped" => {
            block(real_libc::SIGSYS, real_libc::SIG_BLOCK);
            let saved = membership(&mask());
            if case == "pending" {
                let mut action: real_libc::sigaction = unsafe { std::mem::zeroed() };
                action.sa_sigaction = delivered as *const () as usize;
                assert_eq!(unsafe { real_libc::sigaction(real_libc::SIGSYS, &action, std::ptr::null_mut()) }, 0);
                assert_eq!(unsafe { real_libc::pthread_kill(real_libc::pthread_self(), real_libc::SIGSYS) }, 0);
                assert!(pending());
            }
            if case == "trap-skipped" {
                // A real kernel trap would kill this blocked thread if the
                // production guard were removed. Native x86_64 Linux only.
                assert_eq!(std::env::consts::ARCH, "x86_64");
                let filters = [
                    real_libc::sock_filter { code: 0x20, jt: 0, jf: 0, k: 0 },
                    real_libc::sock_filter { code: 0x15, jt: 0, jf: 1, k: 434 },
                    real_libc::sock_filter { code: 0x06, jt: 0, jf: 0, k: 0x00030000 },
                    real_libc::sock_filter { code: 0x06, jt: 0, jf: 0, k: 0x7fff0000 },
                ];
                let program = real_libc::sock_fprog { len: filters.len() as u16, filter: filters.as_ptr() as *mut _ };
                assert_eq!(unsafe { real_libc::prctl(real_libc::PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) }, 0);
                assert_eq!(unsafe { real_libc::prctl(real_libc::PR_SET_SECCOMP, 2, &program) }, 0);
                REAL_CALL.store(1, SeqCst);
            }
            for _ in 0..3 { assert_eq!(pidfd_open(pid, 0), Err(real_libc::ENOSYS)); }
            assert_eq!(CALLS.load(SeqCst), 0);
            assert_eq!(membership(&mask()), saved);
            if case == "pending" {
                assert!(pending()); assert_eq!(DELIVERED.load(SeqCst), 0);
                block(real_libc::SIGSYS, real_libc::SIG_UNBLOCK);
                assert_eq!(DELIVERED.load(SeqCst), 1); assert!(!pending());
            } else { block(real_libc::SIGSYS, real_libc::SIG_UNBLOCK); }
        }
        "thread-local" => {
            block(real_libc::SIGSYS, real_libc::SIG_BLOCK);
            std::thread::spawn(move || {
                block(real_libc::SIGSYS, real_libc::SIG_UNBLOCK);
                assert_eq!(pidfd_open(pid, 0), Ok(Fd(57)));
            }).join().unwrap();
            assert_eq!(pidfd_open(pid, 0), Err(real_libc::ENOSYS));
            assert_eq!(CALLS.load(SeqCst), 1);
            block(real_libc::SIGSYS, real_libc::SIG_UNBLOCK);
        }
        "invalid-pid" => {
            QUERY_ERROR.store(real_libc::EIO, SeqCst);
            for invalid in [0, -1, i32::MIN] { assert_eq!(pidfd_open(invalid, 0), Err(real_libc::EINVAL)); }
            assert_eq!(CALLS.load(SeqCst), 0);
        }
        "query-error" => { QUERY_ERROR.store(real_libc::EIO, SeqCst); assert_eq!(pidfd_open(pid, 0), Err(real_libc::EIO)); assert_eq!(CALLS.load(SeqCst), 0); }
        "membership-error" => { MEMBER_ERROR.store(1, SeqCst); assert_eq!(pidfd_open(pid, 0), Err(real_libc::EINVAL)); assert_eq!(CALLS.load(SeqCst), 0); }
        "syscall-error" => { CALL_ERROR.store(real_libc::EPERM, SeqCst); assert_eq!(pidfd_open(pid, 0), Err(real_libc::EPERM)); assert_eq!(CALLS.load(SeqCst), 1); }
        "real-pidfd" => {
            REAL_CALL.store(1, SeqCst);
            let fd = pidfd_open(pid, 0).expect("Linux 5.3+ pidfd positive control");
            assert!(fd.0 >= 0); assert_eq!(unsafe { real_libc::close(fd.0) }, 0);
            assert_eq!(CALLS.load(SeqCst), 1);
        }
        _ => panic!("unknown case"),
    }
    assert_eq!(membership(&mask()), unblocked);
    println!("OK {case}");
}
