import { openApiSpec } from "./openapi.js";

type PostmanItem = {
  name: string;
  request: {
    method: string;
    url: { raw: string; host: string[]; path: string[]; query?: { key: string; value: string; description?: string; disabled?: boolean }[] };
    description?: string;
  };
};

function buildItems(): PostmanItem[] {
  const items: PostmanItem[] = [];
  const base = "{{baseUrl}}";

  for (const [pattern, methods] of Object.entries(openApiSpec.paths)) {
    const methodsObj = methods as Record<string, unknown>;
    const op = methodsObj["get"] as Record<string, unknown> | undefined;
    if (!op) continue;

    const isPathParam = pattern.includes("{");

    const rawParams = (op["parameters"] ?? []) as Array<Record<string, unknown>>;
    const query = rawParams
      .filter((p) => p["in"] === "query" && p["name"] !== "cache")
      .map((p) => {
        const item: { key: string; value: string; description?: string; disabled?: boolean } = {
          key: String(p["name"] ?? ""),
          value: String((p as Record<string, Record<string, unknown>>)["example"] ?? ""),
          disabled: !(p["required"] as boolean | undefined),
        };
        const desc = p["description"] as string | undefined;
        if (desc !== undefined) item.description = desc;
        return item;
      });

    const pathForUrl = isPathParam
      ? pattern.replace("{", ":").replace("}", "")
      : pattern;

    const urlObj: { raw: string; host: string[]; path: string[]; query?: { key: string; value: string; description?: string; disabled?: boolean }[] } = {
      raw: `${base}${pathForUrl}`,
      host: [base],
      path: pathForUrl.replace(/^\//, "").split("/"),
    };
    if (query.length > 0) {
      urlObj.query = query;
    }

    const requestObj: PostmanItem["request"] = {
      method: "GET",
      url: urlObj,
    };
    const desc = op["description"] as string | undefined;
    if (desc !== undefined) requestObj.description = desc;

    items.push({
      name: (op["summary"] as string | undefined) ?? pattern,
      request: requestObj,
    });
  }

  return items;
}

export const POSTMAN_BODY = JSON.stringify({
  info: {
    name: "AOTY API",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    description: openApiSpec.info.description,
  },
  variable: [{ key: "baseUrl", value: "/", type: "string" }],
  item: buildItems(),
});
