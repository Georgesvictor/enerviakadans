/**
 * Billit API wrapper voor Peppol e-invoicing.
 *
 * Billit is het gekozen access point. Credentials per tenant in tenants.features
 * of aparte integratie-tabel (later). Nu nog placeholder.
 *
 * API docs: https://www.billit.be/nl/api/
 *
 * Flow:
 *   1. POST /orders (aanmaken order in Billit met UBL-data)
 *   2. POST /orders/{id}/send (naar Peppol netwerk)
 *   3. Polling /orders/{id} voor status
 */

export interface BillitConfig {
  apiKey: string;
  partyId: string;
  baseUrl?: string;
}

export interface BillitOrderInput {
  orderType: "Invoice" | "CreditNote";
  orderNumber: string;
  orderDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  customer: {
    name: string;
    vatNumber?: string;
    peppolIdentifier?: string; // 0208:BE0123456789 bv.
    street?: string;
    zipcode?: string;
    city?: string;
    country?: string;
  };
  totalExcl: number;
  totalVat: number;
  totalIncl: number;
  structuredCommunication?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatPercentage: number;
  }>;
}

export class BillitClient {
  private readonly baseUrl: string;
  constructor(private readonly config: BillitConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.billit.be/v1";
  }

  private async fetch(path: string, init: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        "content-type": "application/json",
        "ApiKey": this.config.apiKey,
        "PartyID": this.config.partyId,
      },
    });
    if (!res.ok) {
      const tekst = await res.text();
      throw new Error(`Billit API error ${res.status}: ${tekst}`);
    }
    return res.json();
  }

  /**
   * Maak een invoice-order aan in Billit.
   */
  async createOrder(input: BillitOrderInput): Promise<{ id: string }> {
    const payload = {
      OrderType: input.orderType,
      OrderNumber: input.orderNumber,
      OrderDate: input.orderDate,
      ExpiryDate: input.expiryDate,
      Customer: {
        Name: input.customer.name,
        VATNumber: input.customer.vatNumber,
        Street: input.customer.street,
        Zipcode: input.customer.zipcode,
        City: input.customer.city,
        Country: input.customer.country ?? "BE",
      },
      TotalExcl: input.totalExcl,
      TotalVAT: input.totalVat,
      TotalIncl: input.totalIncl,
      StructuredCommunication: input.structuredCommunication,
      OrderLines: input.lines.map((l) => ({
        Description: l.description,
        Quantity: l.quantity,
        UnitPrice: l.unitPrice,
        VATPercentage: l.vatPercentage * 100,
      })),
    };
    const r = await this.fetch("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { id: r.OrderID };
  }

  /**
   * Verstuur order via Peppol-netwerk.
   */
  async sendToPeppol(orderId: string): Promise<{ status: string }> {
    const r = await this.fetch(`/orders/${orderId}/send`, {
      method: "POST",
      body: JSON.stringify({ Transport: "peppol" }),
    });
    return { status: r.Status ?? "submitted" };
  }

  /**
   * Poll de status van een Peppol-submission.
   */
  async getStatus(orderId: string): Promise<{
    status: string;
    peppolReceivedDate?: string;
  }> {
    const r = await this.fetch(`/orders/${orderId}`);
    return {
      status: r.OrderStatus ?? "unknown",
      peppolReceivedDate: r.PeppolReceivedDate,
    };
  }
}

/**
 * Factory die een client maakt op basis van tenant-configuratie.
 * Huidige implementatie: via env vars. Later: per-tenant uit DB.
 */
export function billitClientVoorTenant(_tenantId: string): BillitClient | null {
  const apiKey = process.env.BILLIT_API_KEY;
  const partyId = process.env.BILLIT_PARTY_ID;
  if (!apiKey || !partyId) return null;
  return new BillitClient({ apiKey, partyId });
}
