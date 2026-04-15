import { defineConfig } from "vite";
import plugin from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 53403,
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
            },
        },
    },
});