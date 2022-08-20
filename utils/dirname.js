import path from "path";
import url from "url";

export const __dirname = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");
