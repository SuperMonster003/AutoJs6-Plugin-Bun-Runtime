#!/usr/bin/python3.8

import importlib.util
import os
import py_compile


def main():
    compiled = 0
    for directory, directory_names, filenames in os.walk("/usr"):
        directory_names.sort()
        for filename in sorted(filenames):
            if not filename.endswith(".pyc"):
                continue
            bytecode_path = os.path.join(directory, filename)
            try:
                source_path = importlib.util.source_from_cache(bytecode_path)
            except ValueError:
                continue
            if not os.path.isfile(source_path):
                continue
            py_compile.compile(
                source_path,
                cfile=bytecode_path,
                doraise=True,
                invalidation_mode=py_compile.PycInvalidationMode.CHECKED_HASH,
            )
            compiled += 1
    if compiled == 0:
        raise RuntimeError("No host Python bytecode was normalized")
    print("Normalized {} existing Python bytecode files".format(compiled))


if __name__ == "__main__":
    main()
