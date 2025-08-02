class PerformanceMonitor {
  constructor() {
    this.apiCalls = new Map();
    this.duplicateRequests = new Map();
    this.enabled = process.env.NODE_ENV === "development";
  }

  trackApiCall(method, url, startTime = Date.now()) {
    if (!this.enabled) return;

    const key = `${method.toUpperCase()}:${url}`;
    const callData = {
      method,
      url,
      startTime,
      endTime: null,
      duration: null,
      status: "pending",
    };

    if (this.apiCalls.has(key)) {
      const existingCall = this.apiCalls.get(key);
      if (existingCall.status === "pending") {
        console.warn(`🔄 Duplicate API call detected: ${key}`);

        if (this.duplicateRequests.has(key)) {
          this.duplicateRequests.set(key, this.duplicateRequests.get(key) + 1);
        } else {
          this.duplicateRequests.set(key, 1);
        }
      }
    }

    this.apiCalls.set(key, callData);
    return key;
  }

  completeApiCall(key, success = true, error = null) {
    if (!this.enabled) return;

    const callData = this.apiCalls.get(key);
    if (callData) {
      callData.endTime = Date.now();
      callData.duration = callData.endTime - callData.startTime;
      callData.status = success ? "success" : "error";
      callData.error = error;

      const status = success ? "✅" : "❌";
      console.log(`${status} API Call: ${key} - ${callData.duration}ms`);
    }
  }

  getStats() {
    if (!this.enabled) return null;

    const stats = {
      totalCalls: this.apiCalls.size,
      duplicateRequests: Array.from(this.duplicateRequests.entries()),
      averageResponseTime: 0,
      slowestCalls: [],
      fastestCalls: [],
    };

    const completedCalls = Array.from(this.apiCalls.values()).filter(
      (call) => call.status !== "pending" && call.duration !== null
    );

    if (completedCalls.length > 0) {
      const totalDuration = completedCalls.reduce(
        (sum, call) => sum + call.duration,
        0
      );
      stats.averageResponseTime = totalDuration / completedCalls.length;

      const sortedCalls = completedCalls.sort(
        (a, b) => b.duration - a.duration
      );
      stats.slowestCalls = sortedCalls.slice(0, 5);
      stats.fastestCalls = sortedCalls.slice(-5).reverse();
    }

    return stats;
  }

  printReport() {
    if (!this.enabled) return;

    const stats = this.getStats();
    if (!stats) return;

    console.group("📊 API Performance Report");
    console.log(`Total API calls: ${stats.totalCalls}`);
    console.log(
      `Average response time: ${stats.averageResponseTime.toFixed(2)}ms`
    );

    if (stats.duplicateRequests.length > 0) {
      console.group("🔄 Duplicate Requests");
      stats.duplicateRequests.forEach(([key, count]) => {
        console.log(`${key}: ${count} duplicates`);
      });
      console.groupEnd();
    } else {
      console.log("✅ No duplicate requests detected");
    }

    if (stats.slowestCalls.length > 0) {
      console.group("🐌 Slowest Calls");
      stats.slowestCalls.forEach((call) => {
        console.log(`${call.method} ${call.url}: ${call.duration}ms`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  clear() {
    this.apiCalls.clear();
    this.duplicateRequests.clear();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

const performanceMonitor = new PerformanceMonitor();

if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    performanceMonitor.printReport();
  }, 30000);
}

export default performanceMonitor;
