# Project Rules

## Testing

1. **No mocking** — All tests must run against real services. Never mock backends, APIs, databases, or any external dependencies. If a service isn't running, start it.
2. **Playwright verification required** — All UI changes and updates must be verified using Playwright (browser snapshot/screenshot) before reporting as complete. Do not claim a frontend task is done without visual confirmation in a real browser.
