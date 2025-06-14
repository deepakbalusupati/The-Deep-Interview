const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Kill any existing node processes on the specific ports
const killProcessOnPort = (port) => {
  try {
    if (process.platform === "win32") {
      spawn(
        "cmd",
        [
          "/c",
          `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`,
        ],
        { stdio: "ignore" }
      );
    } else {
      spawn(
        "sh",
        [
          "-c",
          `lsof -i tcp:${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`,
        ],
        { stdio: "ignore" }
      );
    }
    console.log(`Killed any process on port ${port}`);
  } catch (error) {
    // Ignore errors if no processes to kill
  }
};

// Kill processes on both ports
killProcessOnPort(5001);
killProcessOnPort(3000);

console.log("Starting The Deep Interview application...");

// Start the server
console.log("Starting server on port 5001...");
const server = spawn("node", ["server/index.js"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT: 5001 },
});

server.on("error", (error) => {
  console.error("Failed to start server:", error);
});

// Wait for server to start
setTimeout(() => {
  console.log("Starting client on port 3000...");

  // Set environment variables for the client
  const clientEnv = {
    ...process.env,
    PORT: 3000,
    BROWSER: "none", // Don't open browser automatically
    REACT_APP_API_URL: "http://localhost:5001",
  };

  // Start the client
  const client = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["start"],
    {
      stdio: "inherit",
      shell: true,
      cwd: path.join(process.cwd(), "client"),
      env: clientEnv,
    }
  );

  client.on("error", (error) => {
    console.error("Failed to start client:", error);
  });

  console.log("Both server and client are now running.");
  console.log("Server: http://localhost:5001");
  console.log("Client: http://localhost:3000");
  console.log("Press Ctrl+C to stop both processes.");
}, 3000); // Wait 3 seconds for server to start
