export interface AuthConfig {
  type: "bearer" | "basic" | "custom" | "none";
  token?: string;
  username?: string;
  password?: string;
  headerName?: string;
  headerValue?: string;
}

export interface ProxyConfig {
  type: "socks5" | "http" | "https" | "none";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

export interface FileUpload {
  path: string;
  fieldName?: string;
}

export interface RestRequestPayload {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  files?: Record<string, FileUpload>;
  formData?: Record<string, string | number | boolean>;
  auth?: AuthConfig;
  proxy?: ProxyConfig;
  timeout?: number;
  validateStatus?: boolean;
}

export interface RestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType?: string;
}

export interface SyntaxHelpEntry {
  endpoint: string;
  method: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  requestTemplate?: string;
  responseExample?: string;
  notes?: string[];
}
