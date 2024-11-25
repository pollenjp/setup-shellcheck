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
      - uses: actions/checkout@v4
      - name: Run shellcheck
        run: shellcheck -d .
```
