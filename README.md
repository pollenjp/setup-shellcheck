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

If you use self-hosted GitHub Enterprise, set the specific version (`X.Y.Z`), or
set `github-token` empty and `version: latest`.

```yaml
jobs:
  shellcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: pollenjp/setup-shellcheck@v1
        with:
          version: 0.10.0
          #
          #or
          #
          # version: latest  # 'latest' requests GitHub API (github.com)
          # github-token: '' # Empty token may result in reaching the rate limit for anonymous requests
      - uses: actions/checkout@v4
      - name: Run shellcheck
        run: shellcheck script.sh
```
