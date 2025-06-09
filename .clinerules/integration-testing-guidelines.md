## Brief overview
This document outlines the guidelines and structure for writing integration tests for the Tree-sitter MCP server. Adhering to these standards ensures that new tools are tested consistently and robustly.

## Server and Client Setup
Integration tests work by running the MCP server as a child process and communicating with it via standard I/O using a client within the test file.

- **Spawning the Server**: The server is spawned in a `beforeAll` hook using `child_process.spawn('node', ['build/index.js'])`. The `stdio` option must be set to `['pipe', 'pipe', 'pipe']` to allow the test client to write to the server's `stdin` and read from its `stdout` and `stderr`.
- **Server Readiness**: The test setup must wait for the server to be fully initialized before running tests. This is achieved by listening to the server's `stderr` stream for a "Server ready." message.
- **Server Teardown**: The server process is terminated in an `afterAll` hook using `serverProcess.kill()` to ensure no orphaned processes are left after tests complete.

## Test Scaffolding
A set of helper functions and a specific test structure are used to manage communication with the server.

- **Sending Requests**: A helper function, `sendRequest`, formats a JSON-RPC 2.0 request and sends it to the server's `stdin`. All tool calls should be sent to the `tools/call` method, with the specific tool `name` and `arguments` passed in the parameters.
- **Receiving Responses**: A corresponding `waitForResponse` helper function listens to the server's `stdout`, buffers the incoming data, and resolves with the parsed JSON response once a complete message is received.
- **Test Structure**:
  - Tests should be defined within a `describe` block.
  - Each test case (`it` block) must be `async`.
  - The test should first call `initialize_treesitter_context` to prepare the server.
  - Subsequent calls to the tool being tested are made using `sendRequest`, followed by `await waitForResponse()`.
  - Assertions are made against the received response using `expect`.
  - Use increased timeouts (e.g., 30000ms) for hooks and tests to accommodate server startup and asynchronous communication.

## Testing Requirements for New Tools
To ensure comprehensive testing, any new tool added to the server must include a suite of integration tests that meet the following criteria:

- **Minimum Test Count**: A minimum of five integration tests are required for each new tool.
- **Error State Testing**: At least two tests must be dedicated to verifying error states. Examples include:
  - Providing invalid or missing arguments.
  - Attempting to operate on a non-existent file.
  - Triggering any other expected failure condition.
- **Success State Testing**: At least three tests must be dedicated to verifying the tool's successful operation. These tests must involve file-based operations where the server reads, searches, or analyzes a file.
  - Test files should be placed in the `tests/fixtures/` directory.
  - The `path` argument for the tool must be an absolute path, which can be generated using `path.resolve(__dirname, 'fixtures', 'your-test-file.ext')`.
