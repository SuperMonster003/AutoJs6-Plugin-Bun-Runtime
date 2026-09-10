// SPDX-License-Identifier: MIT
#include <atomic>
#include <chrono>
#include <dirent.h>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <set>
#include <string>
#include <thread>
#include <sys/syscall.h>
#include "bun-scoped-open.h"
#include "binding.inc"
namespace fs = std::filesystem;
using BunScopedOpen::LinuxOps;
static void check(bool ok, const char* text) { if (!ok) throw std::runtime_error(text); }
static size_t fdCount()
{
    DIR* stream = opendir("/proc/self/fd"); check(stream, "fd inventory");
    size_t n = 0; while (auto* e = readdir(stream)) if (e->d_name[0] != '.') ++n;
    closedir(stream); return n;
}
struct Fixture {
    fs::path base, root;
    int fd = -1;
    Fixture()
    {
        char temp[] = "/tmp/bun-scoped-open-XXXXXX";
        char* made = mkdtemp(temp); check(made, "private test directory");
        base = made; root = base / "public";
        fs::create_directories(root / "sub"); fs::create_directory(base / "outside");
        std::ofstream(root / "ok.txt") << "OK";
        std::ofstream(root / "sub" / "nested.txt") << "NESTED";
        std::ofstream(root / "unicode-中文-é.txt") << "UNICODE";
        std::ofstream(base / "secret.txt") << "SECRET";
        std::ofstream(base / "outside" / "nested.txt") << "SECRET";
        fs::create_symlink("ok.txt", root / "alias");
        fs::create_symlink("/ok.txt", root / "absolute-inside");
        fs::create_symlink("../secret.txt", root / "relative-escape");
        fs::create_symlink(base / "secret.txt", root / "absolute-escape");
        fs::create_symlink("../ok.txt", root / "clamped");
        fs::create_symlink("sub", root / "dir-alias");
        fs::create_symlink("../ok.txt", root / "sub" / "up");
        fs::create_symlink("loop", root / "loop");
        check(mkfifo((root / "fifo").c_str(), 0600) == 0, "FIFO");
        fd = open(root.c_str(), O_PATH | O_DIRECTORY | O_CLOEXEC); check(fd >= 0, "root handle");
    }
    ~Fixture()
    {
        if (fd >= 0) close(fd);
        // Only the exact directory returned by mkdtemp; remove_all does not
        // follow the symlinks intentionally created by these tests.
        std::error_code ignored; fs::remove_all(base, ignored);
    }
};
static int flags = O_RDONLY | O_CLOEXEC | O_NONBLOCK;
static std::string contents(int fd)
{
    check(fd >= 0, "expected open success"); char buffer[64];
    const ssize_t n = read(fd, buffer, sizeof(buffer)); const int saved = errno;
    const int descriptorFlags = fcntl(fd, F_GETFD); close(fd); errno = saved;
    check(n >= 0 && (descriptorFlags & FD_CLOEXEC), "read and CLOEXEC");
    return std::string(buffer, n);
}
static void miss(int fd, int expected)
{
    const int saved = errno; if (fd >= 0) close(fd);
    check(fd == -1 && saved == expected, "expected bounded errno");
}
static int oracle(int root, const char* path)
{
    struct { uint64_t flags, mode, resolve; } how { static_cast<uint64_t>(flags), 0, 0x12 };
    return static_cast<int>(syscall(437, root, path, &how, sizeof(how)));
}
static std::string mutation, failure;
static Fixture* active;
static bool mutated;
static unsigned faults, attempts;
static std::set<int> owned;
struct TestOps : LinuxOps {
    static bool fail(const char* point)
    {
        if (failure != point) return false;
        ++attempts;
        if (faults) { --faults; errno = EINTR; return true; }
        return false;
    }
    static int open(int dir, const char* path, int f)
    {
        if (fail("open-eintr")) return -1;
        if (failure == "open-emfile") return BunScopedOpen::error(EMFILE);
        if (failure == "proc-denied" && !strcmp(path, "/proc/self/fd")) return BunScopedOpen::error(EACCES);
        int out = LinuxOps::open(dir, path, f);
        if (out >= 0) check(owned.insert(out).second, "owned fd unique");
        if (out >= 0 && !mutated && (f & O_NOFOLLOW)) {
            if (mutation == "pin-file" && !strcmp(path, "ok.txt")) {
                mutated = true; fs::rename(active->root / "ok.txt", active->root / "original");
                fs::create_symlink(active->base / "secret.txt", active->root / "ok.txt");
            } else if (mutation == "pin-link" && !strcmp(path, "alias")) {
                mutated = true; fs::remove(active->root / "alias");
                fs::create_symlink(active->base / "secret.txt", active->root / "alias");
            } else if (mutation == "move-parent" && !strcmp(path, "sub")) {
                mutated = true; fs::rename(active->root / "sub", active->base / "moved");
                fs::create_symlink(active->base / "outside", active->root / "sub");
            }
        }
        return out;
    }
    static int stat(int fd, struct stat* st)
    {
        if (fail("stat-eintr")) return -1;
        if (failure == "stat-denied") return BunScopedOpen::error(EACCES);
        return LinuxOps::stat(fd, st);
    }
    static int fsstat(int fd, struct statfs* st)
    {
        if (fail("fsstat-eintr")) return -1;
        if (failure == "fsstat-denied") return BunScopedOpen::error(EACCES);
        int rc = LinuxOps::fsstat(fd, st);
        if (rc == 0 && failure == "fake-proc") st->f_type = 0;
        return rc;
    }
    static ssize_t link(int fd, char* text, size_t size)
    {
        if (fail("link-eintr")) return -1;
        if (failure == "link-denied") return BunScopedOpen::error(EACCES);
        if (failure == "link-truncated") return static_cast<ssize_t>(size);
        return LinuxOps::link(fd, text, size);
    }
    static int close(int fd)
    {
        check(owned.erase(fd) == 1, "owned descriptor closed exactly once");
        int rc = LinuxOps::close(fd);
        if (failure == "close-eintr") return BunScopedOpen::error(EINTR);
        return rc;
    }
};
static void functional(Fixture& f)
{
    check(contents(bun_open_in_root_readonly(f.fd, "ok.txt", flags, 0)) == "OK", "production C bridge");
    for (const auto& path : { "ok.txt", "alias", "absolute-inside", "clamped", "sub/up", "../../ok.txt", "/ok.txt", "sub/../ok.txt", "./ok.txt", "sub//../ok.txt" }) {
        check(contents(BunScopedOpen::resolve(f.fd, path, flags, 0)) == "OK", path);
        check(contents(oracle(f.fd, path)) == "OK", "native openat2 oracle");
    }
    check(contents(BunScopedOpen::resolve(f.fd, "dir-alias/nested.txt", flags, 0)) == "NESTED", "directory link");
    check(contents(BunScopedOpen::resolve(f.fd, "unicode-中文-é.txt", flags, 0)) == "UNICODE", "UTF-8");
    for (const char* path : { "relative-escape", "absolute-escape", "missing", "alias/missing" }) {
        const int expected = !strcmp(path, "alias/missing") ? ENOTDIR : ENOENT;
        miss(BunScopedOpen::resolve(f.fd, path, flags, 0), expected);
        miss(oracle(f.fd, path), expected);
    }
    for (const char* path : {"ok.txt/", "ok.txt/.", "ok.txt/.."}) miss(BunScopedOpen::resolve(f.fd, path, flags, 0), ENOTDIR);
    for (const char* path : {".", "/", "..", "sub/", "dir-alias/"}) {
        int result = BunScopedOpen::resolve(f.fd, path, flags, 0); struct stat st;
        check(result >= 0 && fstat(result, &st) == 0 && S_ISDIR(st.st_mode), "directory result"); close(result);
    }
    miss(BunScopedOpen::resolve(f.fd, "", flags, 0), ENOENT);
    miss(BunScopedOpen::resolve(f.fd, "loop", flags, 0), ELOOP);
    miss(BunScopedOpen::resolve(f.fd, "fifo", flags, 0), EOPNOTSUPP);
    miss(BunScopedOpen::resolve(f.fd, "ok.txt", flags | O_DIRECTORY, 0), ENOTDIR);
}
static void bounds(Fixture& f)
{
    miss(BunScopedOpen::resolve(-1, "ok.txt", flags, 0), EBADF);
    miss(BunScopedOpen::resolve(f.fd, nullptr, flags, 0), EINVAL);
    for (int extra : {O_WRONLY, O_RDWR, O_CREAT, O_TRUNC, O_APPEND, O_NOFOLLOW, O_PATH})
        miss(BunScopedOpen::resolve(f.fd, "ok.txt", flags | extra, 0), EINVAL);
    miss(BunScopedOpen::resolve(f.fd, "ok.txt", flags, 0600), EINVAL);
    miss(BunScopedOpen::resolve(f.fd, std::string(4096, 'x').c_str(), flags, 0), ENAMETOOLONG);
    miss(BunScopedOpen::resolve(f.fd, std::string(256, 'x').c_str(), flags, 0), ENAMETOOLONG);
    std::ofstream(f.root / std::string(255, 'x')) << "OK";
    check(contents(BunScopedOpen::resolve(f.fd, std::string(255, 'x').c_str(), flags, 0)) == "OK", "NAME_MAX");
    for (int i = 40; i >= 0; --i) fs::create_symlink(i == 40 ? "ok.txt" : "link" + std::to_string(i + 1), f.root / ("link" + std::to_string(i)));
    check(contents(BunScopedOpen::resolve(f.fd, "link1", flags, 0)) == "OK", "40 links");
    miss(BunScopedOpen::resolve(f.fd, "link0", flags, 0), ELOOP);
    fs::create_symlink(std::string(4090, 'x'), f.root / "expansion");
    miss(BunScopedOpen::resolve(f.fd, "expansion/tail", flags, 0), ENAMETOOLONG);
    check(contents(BunScopedOpen::resolve(f.fd, "ok.txt", flags, 0)) == "OK", "root and file unchanged");
}
static void magic(Fixture& f)
{
    int secret = open((f.base / "secret.txt").c_str(), flags); check(secret >= 0, "owned sentinel");
    int proc = open("/proc/self/fd", O_PATH | O_DIRECTORY | O_CLOEXEC); check(proc >= 0, "proc root");
    const std::string number = std::to_string(secret);
    miss(BunScopedOpen::resolve(proc, number.c_str(), flags, 0), ELOOP);
    miss(oracle(proc, number.c_str()), ELOOP);
    fs::create_symlink("/proc/self/fd/" + number, f.root / "magic");
    miss(BunScopedOpen::resolve(f.fd, "magic", flags, 0), ENOENT);
    close(proc); close(secret);
}
static void injected(Fixture& f, const std::string& mode)
{
    failure = mode; const bool interrupted = mode.find("eintr") != std::string::npos && mode != "close-eintr";
    faults = interrupted ? 1 : 0;
    const int out = BunScopedOpen::resolve<TestOps>(f.fd, "alias", flags, 0);
    if (interrupted || mode == "close-eintr") {
        check(owned.erase(out) == 1, "returned fd ownership transfer");
        check(contents(out) == "OK", "retry/cleanup success");
    } else miss(out, mode == "open-emfile" ? EMFILE : mode == "link-truncated" ? ENAMETOOLONG : mode == "fake-proc" ? EOPNOTSUPP : EACCES);
    check(owned.empty(), "failure closes every temporary fd");
    if (interrupted) {
        faults = 100; attempts = 0;
        miss(BunScopedOpen::resolve<TestOps>(f.fd, "alias", flags, 0), EINTR);
        check(attempts == 9 && owned.empty(), "EINTR budget and cleanup");
    }
}
static void race(Fixture& f, const std::string& mode)
{
    active = &f; mutation = mode;
    const char* path = mode == "pin-file" ? "ok.txt" : mode == "pin-link" ? "alias" : "sub/nested.txt";
    int out = BunScopedOpen::resolve<TestOps>(f.fd, path, flags, 0);
    check(mutated, "deterministic mutation reached");
    if (mode == "move-parent") miss(out, EAGAIN);
    else { check(owned.erase(out) == 1, "returned pinned fd"); check(contents(out) == "OK", "pinned original, not replacement"); }
    check(owned.empty(), "race cleanup");
}
static void stress(Fixture& f)
{
    std::atomic<bool> stop{false}; std::atomic<unsigned> changes{0};
    std::thread writer([&] {
        while (!stop.load()) {
            std::error_code ec;
            fs::remove(f.root / "swap", ec); fs::create_symlink("ok.txt", f.root / "swap", ec);
            fs::remove(f.root / "swap", ec); fs::create_symlink(f.base / "secret.txt", f.root / "swap", ec);
            ++changes;
        }
    });
    bool safe = true;
    for (unsigned i = 0; i < 3000; ++i) {
        int out = BunScopedOpen::resolve(f.fd, "swap", flags, 0);
        if (out >= 0) { char data[16]; const ssize_t n = read(out, data, sizeof(data)); close(out); safe &= n == 2 && data[0] == 'O' && data[1] == 'K'; }
        else safe &= errno == ENOENT || errno == EAGAIN;
    }
    stop = true; writer.join(); check(changes > 0 && safe, "concurrent replacement never returns sentinel");
}
int main(int argc, char** argv)
{
    try {
        check(argc == 2, "one case required"); const std::string mode = argv[1];
        Fixture f; const size_t before = fdCount();
        if (mode == "functional") functional(f);
        else if (mode == "bounds") bounds(f);
        else if (mode == "magic") magic(f);
        else if (mode == "pin-file" || mode == "pin-link" || mode == "move-parent") race(f, mode);
        else if (mode == "stress") stress(f);
        else if (mode == "old-control") {
            check(contents(openat(f.fd, "relative-escape", flags)) == "SECRET", "old fallback must expose the same sentinel");
            miss(BunScopedOpen::resolve(f.fd, "relative-escape", flags, 0), ENOENT);
        } else injected(f, mode);
        check(fdCount() == before, "no descriptor leak");
        std::cout << "OK " << mode << '\n'; return 0;
    } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
