ARG SOURCE_DATE_EPOCH=1788278400
FROM ubuntu@sha256:8feb4d8ca5354def3d8fce243717141ce31e2c428701f6682bd2fafe15388214

ARG EXPECTED_PACKAGE_COUNT
ARG EXPECTED_PACKAGE_MANIFEST_SHA256
ARG HOST_PACKAGE_LOCK_SHA256
ARG SOURCE_DATE_EPOCH

COPY --from=host_packages / /host-debs/
COPY tools/bun-runtime/experimental/api28/install-host-packages.sh /usr/local/lib/autojs6/install-host-packages.sh
COPY tools/bun-runtime/experimental/api28/normalize-host-python-bytecode.py /usr/local/lib/autojs6/normalize-host-python-bytecode.py

RUN /usr/local/lib/autojs6/install-host-packages.sh \
      "${EXPECTED_PACKAGE_COUNT}" \
      "${EXPECTED_PACKAGE_MANIFEST_SHA256}" && \
    rm -f \
      /usr/local/lib/autojs6/install-host-packages.sh \
      /usr/local/lib/autojs6/normalize-host-python-bytecode.py && \
    rm -rf /host-debs && \
    rm -f /tmp/autojs6-host-package-*.log /tmp/autojs6-host-package-*.tsv

ENV ANDROID_NDK_ROOT=/opt/autojs6/android-ndk-r27c
ENV PATH=/usr/lib/llvm-21/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV TZ=UTC
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

LABEL org.opencontainers.image.title="AutoJs6 Bun Android API 28 build host" \
      org.opencontainers.image.description="Byte-locked offline Ubuntu package layer for the downstream Bun Android experiment" \
      io.github.supermonster003.autojs6.host-package-lock-sha256="${HOST_PACKAGE_LOCK_SHA256}" \
      io.github.supermonster003.autojs6.source-date-epoch="${SOURCE_DATE_EPOCH}"

CMD ["/bin/bash"]
