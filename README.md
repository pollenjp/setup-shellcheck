# setup-shellcheck

- Install [shellcheck](https://github.com/koalaman/shellcheck) and cache it for
  GitHub Actions
- Caching makes it especially efficient when using self-hosted runners

## Usage

```yaml
jobs:
  shellcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: pollenjp/setup-shellcheck@v1
        with:
          version: latest
          # version: 0.10.0
      - uses: actions/checkout@v4
      - name: Run shellcheck
        run: shellcheck script.sh
```

If you use self-hosted GitHub Enterprise, you should set `github-token` empty.

```yaml
jobs:
  shellcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: pollenjp/setup-shellcheck@v1
        with:
          github-token: ''
      - uses: actions/checkout@v4
      - name: Run shellcheck
        run: shellcheck script.sh
```
