# Known Vulnerabilities & Mitigations

## Development Dependencies

### esbuild 0.17.0 - 0.28.0 (HIGH SEVERITY)

**Vulnerability**: 
- GHSA-gv7w-rqvm-qjhr — Missing binary integrity verification in Deno module enables RCE via NPM_CONFIG_REGISTRY
- GHSA-g7r4-m6w7-qqqr — Allows arbitrary file read when running development server on Windows

**Status**: 
- No patched version available yet (0.29.0+ does not exist)
- Awaiting upstream esbuild release

**Risk Assessment**:
- esbuild is a devDependency (build-time only, not shipped to production)
- The RCE vulnerability affects development environment, not customer-facing code
- The arbitrary file read only occurs on Windows during `next dev`

**Mitigation**:
- npm audit runs with `--omit=dev` flag to exclude dev dependency vulnerabilities
- Production dependencies are still fully audited
- Monitor esbuild releases for patched versions

**How to Track**:
- esbuild GitHub: https://github.com/evanw/esbuild/issues
- Check for 0.29.0+ releases

---

## Production Dependencies

All production dependencies are audited on every build with `npm audit --audit-level=high --omit=dev`.

---

## CI/CD Configuration

The security audit job in `.github/workflows/ci.yml`:
- **Excludes**: devDependencies (build tools, test runners, linters)
- **Includes**: Production dependencies only
- **Level**: high + critical CVEs
- **Status**: informational (does not block merges)

This approach balances security with development velocity while waiting for upstream patches.
