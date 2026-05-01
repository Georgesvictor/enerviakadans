/**
 * SignRequest API wrapper voor digitale handtekeningen.
 *
 * https://signrequest.com/api/
 *
 * Flow:
 *   1. POST /documents (upload PDF)
 *   2. POST /signrequests (start sign-flow met signers)
 *   3. Webhook bij ondertekening → signed_pdf_url + audit_log
 */

export interface SignRequestConfig {
  apiToken: string;
  subdomain?: string;
}

export interface CreateSignRequestInput {
  documentName: string;
  pdfBuffer: Buffer;
  signers: Array<{ email: string; naam?: string }>;
  message?: string;
  redirectUrl?: string;
}

export class SignRequestClient {
  private readonly baseUrl: string;
  constructor(private readonly config: SignRequestConfig) {
    const sub = config.subdomain ?? "kadans";
    this.baseUrl = `https://${sub}.signrequest.com/api/v1`;
  }

  private async fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Token ${this.config.apiToken}`,
      },
    });
    if (!res.ok)
      throw new Error(`SignRequest ${path} ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async uploadDocument(args: { name: string; pdfBuffer: Buffer }): Promise<{ uuid: string }> {
    const fd = new FormData();
    fd.append("name", args.name);
    fd.append(
      "file_from_content",
      new Blob([args.pdfBuffer as any], { type: "application/pdf" }),
      args.name,
    );
    fd.append("file_from_content_name", args.name);
    return this.fetch<{ uuid: string }>("/documents/", {
      method: "POST",
      body: fd as any,
    });
  }

  async createSignRequest(args: {
    documentUuid: string;
    signers: { email: string; first_name?: string; last_name?: string }[];
    message?: string;
    redirectUrl?: string;
  }): Promise<{ uuid: string; signers: any[] }> {
    return this.fetch("/signrequests/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        document: `${this.baseUrl}/documents/${args.documentUuid}/`,
        signers: args.signers,
        message: args.message,
        redirect_url: args.redirectUrl,
      }),
    });
  }

  async getStatus(uuid: string): Promise<{
    status: string;
    signers: any[];
    signed_document?: { file?: string };
  }> {
    return this.fetch(`/signrequests/${uuid}/`);
  }
}

export function signRequestClient(): SignRequestClient | null {
  const token = process.env.SIGNREQUEST_API_TOKEN;
  if (!token) return null;
  return new SignRequestClient({
    apiToken: token,
    subdomain: process.env.SIGNREQUEST_SUBDOMAIN,
  });
}
