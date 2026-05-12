# Security Policy

## Supported Versions

This is a personal fork of [homebridge-shelly-ds9](https://github.com/alexryd/homebridge-shelly-ds9)
packaged as `homebridge-shelly-ds9-dev`. Only the current `main` branch receives security fixes.

| Branch | Supported |
|--------|-----------|
| `main` | Yes |
| `hubris` | In-progress work — not for production |
| Older tags | No |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report security issues privately by emailing **hdeknop@gmail.com** with:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept (if safe to share)
- Any suggested mitigations

You can expect an acknowledgement within 48 hours and a resolution or status update within 14 days.

## Configuration Security

Homebridge stores all plugin configuration — including device passwords — in plaintext in
`config.json`. To limit exposure:

- Restrict permissions on the config file:
  ```bash
  chmod 600 /var/lib/homebridge/config.json
  chown homebridge:homebridge /var/lib/homebridge/config.json
  ```
- Keep your Homebridge instance on an isolated VLAN or network segment away from untrusted devices.
- Rotate Shelly device passwords if the config file is ever exposed.
- Do not commit `config.json` to version control.

## Network Security

This plugin communicates with Shelly devices over WebSocket (ws:// or wss://). On a trusted local
network this is generally acceptable, but consider:

- Enabling authentication on all Shelly devices (set a password in the Shelly web UI).
- Using a dedicated IoT VLAN with firewall rules that prevent devices from initiating outbound
  internet connections.
- The plugin does **not** make any outbound connections to Allterco/Shelly cloud services.
  All communication is local.
