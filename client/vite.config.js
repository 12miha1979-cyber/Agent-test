import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react()],
    server: {
      host: true,
      // VITE_PORT in client/.env.local lets a second tutor run beside the first.
      port: Number(env.VITE_PORT) || 5173,
      // Fail loudly instead of silently moving to another port that start_tutor.bat
      // (and the other tutor) wouldn't expect.
      strictPort: true,
    },
  };
});
