# syntax=docker/dockerfile:1
FROM envoyproxy/envoy:v1.39.1
# Preserve the official gateway/key translation/Basic Auth entrypoint.
COPY --chmod=644 vendor/docker/volumes/api/envoy/envoy.yaml /etc/envoy/envoy.yaml
COPY --chmod=644 config/envoy/cds.yaml /etc/envoy/cds.yaml
COPY --chmod=644 config/envoy/lds.template.yaml /etc/envoy/lds.template.yaml
COPY --chmod=755 vendor/docker/volumes/api/envoy/docker-entrypoint.sh /docker-entrypoint.sh
