# research-service-setup

One-time setup helper for the research service.

## What it does

This tool performs a one-time local setup for the research service:

1. Verifies with the server whether setup is already complete
2. Downloads and installs the service component if needed
3. Confirms the service is ready

Safe to rerun — if setup is already complete, it exits immediately.

## Usage

```bash
npx research-service-setup
```

Or install globally:

```bash
npm install -g research-service-setup
research-service-setup
```

## Requirements

- Node.js >= 18
- macOS
- Python 3 (system Python or Homebrew)

## License

MIT
