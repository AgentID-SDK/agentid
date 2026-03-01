# Contributing to AgentID

Thank you for your interest in contributing to AgentID. This document provides guidelines and information for contributors.

## Developer Certificate of Origin (DCO)

All contributions to this project must be signed off with the [Developer Certificate of Origin](https://developercertificate.org/) (DCO). This certifies that you wrote the contribution or otherwise have the right to submit it under the project's license.

Sign off your commits by adding `Signed-off-by` to your commit messages:

```
git commit -s -m "Your commit message"
```

This adds a line like `Signed-off-by: Your Name <your.email@example.com>` to the commit. You must use your real name (no pseudonyms or anonymous contributions).

## How to contribute

### Reporting bugs

Open an issue using the **Bug Report** template. Include:
- A clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- SDK version, language, and runtime environment
- Relevant manifest/policy snippets (redact any real keys)

### Suggesting features

Open an issue using the **Feature Request** template. Describe:
- The problem you are trying to solve
- Your proposed solution
- Alternatives you have considered

### Spec proposals

Changes to the AgentID specification (manifest schema, signature format, policy format) follow a stricter process:

1. Open an issue using the **Spec Proposal** template.
2. Allow 2 weeks for community discussion.
3. Require approval from at least 2 maintainers.
4. Breaking changes require a new major version with a documented migration path.

### Code contributions

1. Fork the repository.
2. Create a feature branch from `main`: `git checkout -b feat/your-feature`
3. Make your changes. Follow the coding standards below.
4. Add or update tests. All contributions must include tests.
5. Ensure all tests pass: `npm test` (TypeScript) or `pytest` (Python).
6. Ensure linting passes: `npm run lint` (TypeScript) or `ruff check` (Python).
7. Commit with DCO sign-off: `git commit -s -m "feat: your change"`
8. Push and open a pull request against `main`.

## Coding standards

### TypeScript (`packages/core-ts`, `packages/cli`)

- Strict TypeScript (`strict: true` in tsconfig)
- No `any` types unless absolutely necessary and documented
- Use `vitest` for testing
- Use `prettier` for formatting and `eslint` for linting
- Exported functions must have JSDoc comments

### Python (`packages/core-py`)

- Python 3.9+ compatibility
- Type hints on all public functions
- Use `pytest` for testing
- Use `ruff` for linting and formatting
- Docstrings on all public functions (Google style)

### Cross-language consistency

- All SDKs must pass the shared test vector suite in `spec/test-vectors/`.
- API names should be consistent across languages, adjusted for language idioms (e.g., `snake_case` in Python, `camelCase` in TypeScript).
- Identical inputs must produce identical outputs across all SDKs.

## Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

Signed-off-by: Your Name <email>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `spec`

Scopes: `core-ts`, `core-py`, `cli`, `spec`, `examples`, `ci`

## Branch naming

- `feat/description` -- new features
- `fix/description` -- bug fixes
- `spec/description` -- specification changes
- `docs/description` -- documentation only
- `chore/description` -- tooling, CI, dependencies

## Review process

- All PRs require at least 1 maintainer review.
- Spec changes require at least 2 maintainer reviews.
- CI must pass before merge.
- Squash merge is the default merge strategy.

## Getting help

- Open a GitHub Discussion for questions.
- Tag issues with `good first issue` for newcomer-friendly tasks.
- Maintainers aim to respond to issues and PRs within 48 hours.
