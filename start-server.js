const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Kill any existing node processes (optional)
try {
  if (process.platform === "win32") {
    spawn("taskkill", ["/F", "/IM", "node.exe"], { stdio: "ignore" });
  } else {
    spawn("pkill", ["node"], { stdio: "ignore" });
  }
} catch (error) {
  // Ignore errors if no processes to kill
}

console.log("Starting server...");

// Start the server
const server = spawn("node", ["server/index.js"], {
  stdio: "inherit",
  shell: true,
});

server.on("error", (error) => {
  console.error("Failed to start server:", error);
});

console.log("Server started. Press Ctrl+C to stop.");
