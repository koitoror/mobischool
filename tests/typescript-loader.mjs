import { readFile } from "node:fs/promises";
import ts from "typescript";
export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) {
    for (const ext of [".tsx", ".ts"]) {
      try {
        return await next(specifier + ext, context);
      } catch {}
    }
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.endsWith(".css"))
    return { format: "module", source: "export default {}", shortCircuit: true };
  if (/\.tsx?$/.test(url)) {
    return {
      format: "module",
      source: ts.transpileModule(await readFile(new URL(url), "utf8"), {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText,
      shortCircuit: true,
    };
  }
  return next(url, context);
}
