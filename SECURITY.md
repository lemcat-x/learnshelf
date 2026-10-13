# Security policy

## Supported version

Only the newest public alpha is considered for security fixes. There is currently no stability or long-term-support promise.

## Reporting

Do not publish API keys, personal course materials, local paths, or exploit details in a public issue. Report a suspected vulnerability through GitHub's private vulnerability reporting feature when available.

Useful reports include the affected version, operating system, reproduction steps, expected impact, and a minimal sanitized course or HTML experiment.

The local server is designed for `127.0.0.1`. Do not expose it directly to an untrusted network. Custom course experiments run in a sandboxed iframe but should still be reviewed before use.
