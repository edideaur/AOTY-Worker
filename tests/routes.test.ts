import { describe, it, expect } from "bun:test";
import worker from "../src/index.ts";

import { createMockEnv } from "./test_utils.js";

const mockEnv = createMockEnv();

function req(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, { method });
}

function fetch(path: string, method = "GET") {
  return worker.fetch(req(path, method), mockEnv);
}

describe("Static & well-known routes smoke tests", () => {
  const routes = [
    ["/health", 200, "application/json"],
    ["/.well-known/health", 200, "application/json"],
    ["/ping", 200, null],
    ["/robots.txt", 200, "text/plain"],
    ["/humans.txt", 200, "text/plain"],
    ["/.well-known/security.txt", 200, "text/plain"],
    ["/.well-known/ai-plugin.json", 200, "application/json"],
    ["/sitemap.xml", 200, "application/xml"],
    ["/version.json", 200, "application/json"],
    ["/manifest.json", 200, "application/manifest+json"],
    ["/opensearch.xml", 200, "application/opensearchdescription+xml"],
    ["/.well-known/api-catalog", 200, "application/json"],
    ["/openapi.json", 200, "application/json"],
    ["/openapi.yaml", 200, "application/yaml"],
    ["/postman.json", 200, "application/json"],
    ["/", 200, "text/html"],
    ["/scalar", 200, "text/html"],
    ["/redoc", 200, "text/html"],
    ["/swagger", 200, "text/html"],
    ["/rapidoc", 200, "text/html"],
    ["/rapipdf", 200, "text/html"],
    ["/elements", 200, "text/html"],
  ] as const;

  for (const [path, status, contentType] of routes) {
    it(`GET ${path} returns ${status}${contentType ? ` with ${contentType}` : ""}`, async () => {
      const res = await fetch(path);
      expect(res.status).toBe(status);
      if (contentType) {
        expect(res.headers.get("content-type")).toContain(contentType);
      }
    });
  }

  it("GET /favicon.ico redirects to PNG favicon", async () => {
    const res = await fetch("/favicon.ico");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://prigoana.com/favicon.png");
  });

  it("GET / serves Scalar with AOTY custom color theme", async () => {
    const res = await fetch("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("--scalar-color-accent: #2ebd59");
    expect(html).toContain("--scalar-background-1: #202225");
    expect(html).toContain("--scalar-background-2: #2f3136");
    expect(html).toContain("Open+Sans");
    expect(html).toContain("Roboto");
    expect(html).toContain("data-configuration");
  });
});
