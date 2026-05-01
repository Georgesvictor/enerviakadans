/**
 * Ponto PSD2 open banking wrapper.
 *
 * API docs: https://documentation.myponto.com/
 *
 * OAuth2 + X-Request-ID headers. Key endpoints:
 *   - /organizations/{id}/accounts (list bank accounts)
 *   - /accounts/{id}/transactions (list transactions)
 *   - /accounts/{id}/synchronizations (force sync)
 */

export interface PontoConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export interface PontoAccount {
  id: string;
  iban: string;
  currency: string;
  description?: string;
  availableBalance?: number;
  currentBalance?: number;
  holderName?: string;
}

export interface PontoTransaction {
  id: string;
  amount: number;
  currency: string;
  counterpartName?: string;
  counterpartAccountReference?: string;
  remittanceInformation?: string;
  remittanceInformationType?: "structured" | "unstructured";
  executionDate?: string;
  valueDate?: string;
}

export class PontoClient {
  private readonly baseUrl: string;
  private accessToken?: string;
  private tokenExpiresAt = 0;

  constructor(
    private readonly config: PontoConfig,
    private readonly organizationId?: string,
  ) {
    this.baseUrl = config.baseUrl ?? "https://api.myponto.com";
  }

  /** Krijg geldig access_token via client_credentials. */
  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }
    const basic = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");
    const res = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok)
      throw new Error(`Ponto token ${res.status}: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    return this.accessToken!;
  }

  private async get<T>(path: string): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Request-ID": crypto.randomUUID(),
      },
    });
    if (!res.ok)
      throw new Error(`Ponto ${path} ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async listAccounts(): Promise<PontoAccount[]> {
    if (!this.organizationId) throw new Error("organizationId vereist");
    const r = await this.get<{ data: any[] }>(
      `/organizations/${this.organizationId}/accounts`,
    );
    return (r.data ?? []).map((a: any) => ({
      id: a.id,
      iban: a.attributes?.reference,
      currency: a.attributes?.currency,
      description: a.attributes?.description,
      availableBalance: a.attributes?.availableBalance,
      currentBalance: a.attributes?.currentBalance,
      holderName: a.attributes?.holderName,
    }));
  }

  async listTransactions(
    accountId: string,
    opties: { before?: string; after?: string; limit?: number } = {},
  ): Promise<PontoTransaction[]> {
    const params = new URLSearchParams();
    if (opties.before) params.set("page[before]", opties.before);
    if (opties.after) params.set("page[after]", opties.after);
    params.set("page[limit]", String(opties.limit ?? 100));
    const r = await this.get<{ data: any[] }>(
      `/accounts/${accountId}/transactions?${params.toString()}`,
    );
    return (r.data ?? []).map((t: any) => ({
      id: t.id,
      amount: t.attributes?.amount,
      currency: t.attributes?.currency,
      counterpartName: t.attributes?.counterpartName,
      counterpartAccountReference: t.attributes?.counterpartReference,
      remittanceInformation: t.attributes?.remittanceInformation,
      remittanceInformationType: t.attributes?.remittanceInformationType,
      executionDate: t.attributes?.executionDate,
      valueDate: t.attributes?.valueDate,
    }));
  }

  async forceSync(accountId: string): Promise<void> {
    const token = await this.getToken();
    await fetch(`${this.baseUrl}/accounts/${accountId}/synchronizations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "synchronization",
          attributes: { subtype: "accountTransactions" },
        },
      }),
    });
  }
}

export function pontoClientVoorTenant(_tenantId: string): PontoClient | null {
  const cid = process.env.PONTO_CLIENT_ID;
  const cs = process.env.PONTO_CLIENT_SECRET;
  if (!cid || !cs) return null;
  // organizationId is per-tenant en komt uit tenants-tabel of aparte integraties tabel.
  // Voor nu: haal uit env voor demo-setup
  const orgId = process.env.PONTO_ORGANIZATION_ID;
  return new PontoClient({ clientId: cid, clientSecret: cs }, orgId);
}
