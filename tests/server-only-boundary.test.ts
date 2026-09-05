import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = ["app", "components", "src", "lib"];
const sourceFiles = sourceRoots.flatMap((root) => collectSourceFiles(root));

describe("server-only Supabase boundary", () => {
  it("keeps the service role environment variable inside the server client module", () => {
    const directServiceRoleUsers = sourceFiles.filter((file) => readFileSync(file, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"));

    expect(directServiceRoleUsers).toEqual(["src/agents/shared/tools/supabase-server-client.ts"]);
  });

  it("does not import the server Supabase client from UI or shared frontend modules", () => {
    const serverClientUsers = sourceFiles.filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("supabase-server-client") || source.includes("getSupabaseServerClient");
    });

    for (const file of serverClientUsers) {
      expect(file.startsWith("app/api/") || file.startsWith("src/agents/")).toBe(true);
    }
  });
});

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      return collectSourceFiles(filePath);
    }

    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      return [filePath];
    }

    return [];
  });
}
