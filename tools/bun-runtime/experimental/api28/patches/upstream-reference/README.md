# Upstream reference patches

This directory may contain byte-for-byte copies of the five immutable commit
patches locked in `../series.lock.json`. Generate them only with
`../../materialize-upstream-patches.ps1`.

These files document the open upstream review state. They are not the
v1.4.0-specific downstream patch series and must not be fed into a release
build automatically.
