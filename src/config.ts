import { config } from "dotenv";
import { ProxyConfig } from "./types.js";

config();

export interface ServiceConfig {
  elasticComputeBaseUrl: string;
  vectorStoreBaseUrl: string;
  requestTimeout: number;
  defaultProxy: ProxyConfig | null;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value || defaultValue!;
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
    defaultProxy: loadDefaultProxy(),
  };
}
