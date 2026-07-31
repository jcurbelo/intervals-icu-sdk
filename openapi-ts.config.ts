import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./spec/intervals-openapi.normalized.json",
  output: "src/gen",
  plugins: ["@hey-api/client-fetch", "@hey-api/typescript", "@hey-api/sdk"],
});
