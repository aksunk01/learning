#!/bin/sh
set -e

: "${TS_AUTHKEY:?TS_AUTHKEY is required}"
: "${TS_HOSTNAME:?TS_HOSTNAME is required}"
: "${TS_SERVE_TARGET:?TS_SERVE_TARGET is required, e.g. http://127.0.0.1:3000}"

mkdir -p /var/lib/tailscale /var/run/tailscale

tailscaled \
  --tun=userspace-networking \
  --state=/var/lib/tailscale/tailscaled.state \
  --socket=/var/run/tailscale/tailscaled.sock &

# Wait for tailscaled's control socket to exist before trying to log in.
# (Can't use `tailscale status` for this - it exits non-zero whenever the
# device isn't logged in yet, which is true here by definition, so that
# would loop forever instead of just waiting for the daemon to be reachable.)
until [ -S /var/run/tailscale/tailscaled.sock ]; do
  sleep 0.5
done

tailscale --socket=/var/run/tailscale/tailscaled.sock up \
  --authkey="${TS_AUTHKEY}" \
  --hostname="${TS_HOSTNAME}" \
  --accept-dns=true

# Plain HTTP on port 80, not HTTPS - a bareword hostname (e.g. "open-seas")
# only resolves to the app in a browser when there's nothing to fail a TLS
# handshake against. HTTPS via `tailscale serve` issues a cert scoped to the
# full FQDN, so a browser that literally typed the short name sends that as
# SNI and the handshake fails; browsers only silently fall back from HTTPS to
# HTTP on a clean connection failure (nothing on 443), not a failed handshake.
tailscale --socket=/var/run/tailscale/tailscaled.sock serve --bg --http=80 "${TS_SERVE_TARGET}"

tail -f /dev/null
