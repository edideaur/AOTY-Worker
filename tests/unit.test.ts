import { describe, it, expect } from "bun:test";
import { decodeEntities, RES_HEADERS, PROBLEM_HEADERS } from "../src/constants.js";
import { openApiSpec } from "../src/openapi.js";
import { POSTMAN_BODY } from "../src/postman.js";

describe("decodeEntities", () => {
  it("decodes basic HTML numeric entities", () => {
    expect(decodeEntities("&#38;")).toBe("&");
    expect(decodeEntities("&#60;")).toBe("<");
    expect(decodeEntities("&#62;")).toBe(">");
    expect(decodeEntities("&#34;")).toBe('"');
    expect(decodeEntities("&#39;")).toBe("'");
  });

  it("decodes hex entities", () => {
    expect(decodeEntities("&#x26;")).toBe("&");
    expect(decodeEntities("&#x3C;")).toBe("<");
    expect(decodeEntities("&#x3E;")).toBe(">");
    expect(decodeEntities("&#x22;")).toBe('"');
  });

  it("decodes named entities", () => {
    expect(decodeEntities("&amp;")).toBe("&");
    expect(decodeEntities("&lt;")).toBe("<");
    expect(decodeEntities("&gt;")).toBe(">");
    expect(decodeEntities("&quot;")).toBe('"');
    expect(decodeEntities("&apos;")).toBe("'");
    expect(decodeEntities("&nbsp;")).toBe(" ");
    expect(decodeEntities("&ldquo;")).toBe("\u201C");
    expect(decodeEntities("&rdquo;")).toBe("\u201D");
    expect(decodeEntities("&lsquo;")).toBe("\u2018");
    expect(decodeEntities("&rsquo;")).toBe("\u2019");
    expect(decodeEntities("&mdash;")).toBe("\u2014");
    expect(decodeEntities("&ndash;")).toBe("\u2013");
    expect(decodeEntities("&hellip;")).toBe("\u2026");
    expect(decodeEntities("&copy;")).toBe("\u00A9");
    expect(decodeEntities("&eacute;")).toBe("\u00E9");
  });

  it("handles double-escaped entities", () => {
    expect(decodeEntities("&amp;amp;")).toBe("&");
    expect(decodeEntities("&amp;quot;")).toBe('"');
    expect(decodeEntities("&amp;ldquo;")).toBe("\u201C");
  });

  it("leaves normal strings unchanged", () => {
    expect(decodeEntities("Kendrick Lamar - GNX")).toBe("Kendrick Lamar - GNX");
    expect(decodeEntities("")).toBe("");
  });
});

describe("Headers constants", () => {
  it("RES_HEADERS has required CORS and Content-Type", () => {
    expect(RES_HEADERS["Content-Type"]).toBe("application/json");
    expect(RES_HEADERS["Access-Control-Allow-Origin"]).toBe("*");
    expect(RES_HEADERS["Access-Control-Allow-Methods"]).toContain("GET");
  });

  it("PROBLEM_HEADERS has application/problem+json", () => {
    expect(PROBLEM_HEADERS["Content-Type"]).toBe("application/problem+json");
    expect(PROBLEM_HEADERS["Access-Control-Allow-Origin"]).toBe("*");
  });
});

describe("OpenAPI Specification validity", () => {
  it("spec has required top-level metadata", () => {
    expect(openApiSpec.openapi).toBe("3.1.0");
    expect(openApiSpec.info).toBeDefined();
    expect(openApiSpec.info.title).toBe("Album of the Year API");
    expect(openApiSpec.info.version).toBeDefined();
    expect(openApiSpec.paths).toBeDefined();
    expect(openApiSpec.components).toBeDefined();
  });

  it("all endpoints in openApiSpec define valid operations", () => {
    const paths = Object.entries(openApiSpec.paths);
    expect(paths.length).toBeGreaterThanOrEqual(70);

    for (const [path, methods] of paths) {
      expect(path.startsWith("/")).toBe(true);
      const getMethod = (methods as Record<string, unknown>).get as Record<string, unknown> | undefined;
      expect(getMethod).toBeDefined();
      expect(typeof getMethod?.operationId).toBe("string");
      expect(getMethod?.responses).toBeDefined();
    }
  });

  it("all schemas in components are objects", () => {
    const schemas = openApiSpec.components?.schemas ?? {};
    const schemaEntries = Object.entries(schemas);
    expect(schemaEntries.length).toBeGreaterThan(10);

    for (const [name, schema] of schemaEntries) {
      expect(typeof name).toBe("string");
      expect(typeof schema).toBe("object");
    }
  });
});

describe("Postman collection", () => {
  it("contains valid Postman collection JSON", () => {
    const collection = JSON.parse(POSTMAN_BODY);
    expect(collection.info).toBeDefined();
    expect(collection.info.name).toBe("AOTY API");
    expect(Array.isArray(collection.item)).toBe(true);
    expect(collection.item.length).toBeGreaterThan(0);
  });
});
