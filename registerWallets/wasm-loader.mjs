// wasm-loader.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

/**
 * Loader ESM para arquivos `.wasm`.
 * Converte o binário em Uint8Array e exporta como módulo JS.
 * Compatível com Node >= 18.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".wasm")) {
    const parentDir = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : process.cwd();

    const resolvedPath = path.resolve(parentDir, specifier);
    const url = pathToFileURL(resolvedPath).href;

    return { url, format: "module", shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".wasm")) {
    const filePath = fileURLToPath(url);
    if (!fs.existsSync(filePath)) {
      throw new Error(`❌ Arquivo WASM não encontrado: ${filePath}`);
    }

    const bytes = fs.readFileSync(filePath);
    const base64 = bytes.toString("base64");

    const source = `
      const binary = Uint8Array.from(atob("${base64}"), c => c.charCodeAt(0));
      export default binary;
    `;
    return { format: "module", source, shortCircuit: true };
  }

  return nextLoad(url, context);
}
