import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { type AuthConfig, type ProxyConfig } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

config({ path: path.resolve(projectRoot, ".env") });

export interface ServiceConfig {
  elasticComputeBaseUrl: string;
  vectorStoreBaseUrl: string;
  requestTimeout: number;
  defaultAuth: AuthConfig | null;
  defaultProxy: ProxyConfig | null;
  customServices: Record<string, string>;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value || defaultValue!;
}

function loadCustomServices(): Record<string, string> {
  const customServices: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_BASE_URL")) {
      const serviceName = key.replace(/_BASE_URL$/, "").toLowerCase();
      if (
        serviceName !== "elastic_compute" &&
        serviceName !== "vector_store"
      ) {
        customServices[serviceName] = value as string;
      }
    }
  }

  return customServices;
}

function loadDefaultAuth(): AuthConfig | null {
  const authType = process.env.DEFAULT_AUTH_TYPE;

  if (!authType || authType === "none") {
    return null;
  }

  if (authType === "bearer") {
    const token = process.env.DEFAULT_AUTH_TOKEN;
    if (!token) {
      return null;
    }
    return {
      type: "bearer",
      token,
    };
  }

  if (authType === "basic") {
    const username = process.env.DEFAULT_AUTH_USERNAME;
    const password = process.env.DEFAULT_AUTH_PASSWORD;
    if (!username || !password) {
      return null;
    }
    return {
      type: "basic",
      username,
      password,
    };
  }

  if (authType === "custom") {
    const headerName = process.env.DEFAULT_AUTH_HEADER_NAME;
    const headerValue = process.env.DEFAULT_AUTH_HEADER_VALUE;
    if (!headerName || !headerValue) {
      return null;
    }
    return {
      type: "custom",
      headerName,
      headerValue,
    };
  }

  return null;
}

function loadDefaultProxy(): ProxyConfig | null {
  const proxyHost = process.env.SOCKS5_PROXY_HOST;
  const proxyPortStr = process.env.SOCKS5_PROXY_PORT;

  if (!proxyHost) {
    return null;
  }

  const proxyPort = proxyPortStr ? parseInt(proxyPortStr, 10) : 1080;

  return {
    type: "socks5",
    host: proxyHost,
    port: proxyPort,
    username: process.env.SOCKS5_PROXY_USERNAME,
    password: process.env.SOCKS5_PROXY_PASSWORD,
  };
}

export function loadConfig(): ServiceConfig {
  return {
    elasticComputeBaseUrl: getEnvVar(
      "ELASTIC_COMPUTE_BASE_URL",
      "https://preprod.globalcompute.qateradatacloud.com"
    ),
    vectorStoreBaseUrl: getEnvVar(
      "VECTOR_STORE_BASE_URL",
      "https://api.vectorstore.qateradatacloud.com"
    ),
    requestTimeout: parseInt(getEnvVar("REQUEST_TIMEOUT", "30000"), 10),
    defaultAuth: loadDefaultAuth(),
    defaultProxy: loadDefaultProxy(),
    customServices: loadCustomServices(),
  };
}
