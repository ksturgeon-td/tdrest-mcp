import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import {
  RestRequestPayload,
  RestResponse,
  AuthConfig,
  ProxyConfig,
} from "./types.js";
import { expandGlob, validateFile } from "./file-utils.js";

export class RestClient {
  private client: AxiosInstance;
  private authConfig: AuthConfig | null = null;
  private proxyConfig: ProxyConfig | null = null;

  constructor() {
    this.client = axios.create();
  }

  setAuth(auth: AuthConfig): void {
    this.authConfig = auth;
  }

  setProxy(proxy: ProxyConfig): void {
    this.proxyConfig = proxy;
  }

  private buildHeaders(
    payload: RestRequestPayload
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "tdrest-mcp/0.1.0",
      ...payload.headers,
    };

    const auth = payload.auth || this.authConfig;
    if (auth) {
      if (auth.type === "bearer" && auth.token) {
        headers["Authorization"] = `Bearer ${auth.token}`;
      } else if (auth.type === "basic" && auth.username && auth.password) {
        const encoded = Buffer.from(
          `${auth.username}:${auth.password}`
        ).toString("base64");
        headers["Authorization"] = `Basic ${encoded}`;
      } else if (auth.type === "custom" && auth.headerName && auth.headerValue) {
        headers[auth.headerName] = auth.headerValue;
      }
    }

    return headers;
  }

  private buildAxiosConfig(payload: RestRequestPayload): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method: payload.method.toLowerCase() as any,
      headers: this.buildHeaders(payload),
      timeout: payload.timeout || 30000,
      validateStatus: payload.validateStatus ? undefined : () => true,
    };

    const proxy = payload.proxy || this.proxyConfig;
    if (proxy && proxy.type !== "none" && proxy.host && proxy.port) {
      if (proxy.type === "socks5") {
        const socksUrl = `socks5://${
          proxy.username ? `${proxy.username}:${proxy.password}@` : ""
        }${proxy.host}:${proxy.port}`;
        const agent = new SocksProxyAgent(socksUrl);
        config.httpAgent = agent;
        config.httpsAgent = agent;
      }
    }

    return config;
  }

  private async prepareBody(
    payload: RestRequestPayload
  ): Promise<string | FormData | undefined> {
    const form = new FormData();
    let hasFiles = false;

    // Handle filePattern (glob)
    if (payload.filePattern) {
      const matchedFiles = expandGlob(payload.filePattern);
      for (const filePath of matchedFiles) {
        validateFile(filePath);
        const fileName = path.basename(filePath);
        form.append(fileName, fs.createReadStream(filePath));
        hasFiles = true;
      }
    }

    // Handle explicit files
    if (payload.files && Object.keys(payload.files).length > 0) {
      for (const [fieldName, fileUpload] of Object.entries(payload.files)) {
        const filePath = fileUpload.path;
        validateFile(filePath);
        form.append(fieldName, fs.createReadStream(filePath));
        hasFiles = true;
      }
    }

    // If we have files, add form fields and return FormData
    if (hasFiles) {
      if (payload.formData) {
        for (const [key, value] of Object.entries(payload.formData)) {
          form.append(key, value);
        }
      }
      return form;
    }

    if (payload.body) {
      if (typeof payload.body === "string") {
        return payload.body;
      }
      return JSON.stringify(payload.body);
    }

    if (payload.formData && Object.keys(payload.formData).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(payload.formData)) {
        params.append(key, String(value));
      }
      return params.toString();
    }

    return undefined;
  }

  async execute(payload: RestRequestPayload): Promise<RestResponse> {
    const config = this.buildAxiosConfig(payload);
    const body = await this.prepareBody(payload);

    try {
      const response = await this.client({
        ...config,
        url: payload.url,
        data: body,
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body:
          typeof response.data === "string"
            ? response.data
            : JSON.stringify(response.data),
        contentType: String(response.headers["content-type"] || ""),
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers as Record<string, string>,
          body:
            typeof error.response.data === "string"
              ? error.response.data
              : JSON.stringify(error.response.data),
          contentType: String(error.response.headers["content-type"] || ""),
        };
      }
      throw error;
    }
  }
}
