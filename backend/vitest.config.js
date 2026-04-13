import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.js"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/controllers/authController.js",
        "src/controllers/bookingController.js",
        "src/controllers/eventController.js",
        "src/controllers/paymentController.js",
        "src/middlewares/authMiddleware.js",
        "src/middlewares/roleMiddleware.js",
        "src/utils/ticketTiers.js",
      ],
      exclude: [
        "src/**/*.test.js",
        "src/**/__tests__/**",
        "src/test/**",
        "src/server.js",
      ],
    },
  },
});
