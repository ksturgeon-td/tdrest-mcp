import { config } from "dotenv";

config();

export interface ServiceConfig {
  elasticComputeBaseUrl: string;
  vectorStoreBaseUrl: string;
  requestTimeout: number;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value || defaultValue!;
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
  };
}
