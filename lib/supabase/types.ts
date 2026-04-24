/**
 * Database type definitions — manueel gedefinieerd ipv via
 * `supabase gen types` (dat vereist live project). Na live-setup
 * kan dit vervangen worden door de auto-generated output.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          rol: "verkoper" | "admin";
          teamleader_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          rol?: "verkoper" | "admin";
          teamleader_user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      klanten: {
        Row: {
          id: string;
          teamleader_contact_id: string | null;
          voornaam: string;
          achternaam: string;
          email: string | null;
          telefoon: string | null;
          adres: string | null;
          postcode: string | null;
          gemeente: string | null;
          geboortedatum: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["klanten"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["klanten"]["Insert"]>;
      };
      dossiers: {
        Row: {
          id: string;
          klant_id: string | null;
          verkoper_id: string | null;
          teamleader_quotation_id: string | null;
          offerte_pdf_url: string | null;
          offerte_referentie: string | null;
          offerte_datum: string | null;
          klant_token: string;
          klant_token_expires_at: string | null;
          status: "draft" | "extracted" | "compleet" | "gedeeld";
          auto_verwijder_op: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["dossiers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["dossiers"]["Row"]>;
      };
      offerte_extracties: {
        Row: {
          id: string;
          dossier_id: string;
          raw_pdf_text: string | null;
          gestructureerde_data: Json;
          extractie_model: string;
          validatie_score: number | null;
          validatie_opmerkingen: string | null;
          goedgekeurd_door_verkoper: boolean;
          manuele_correcties: Json;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["offerte_extracties"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["offerte_extracties"]["Row"]
        >;
      };
      klant_parameters: {
        Row: {
          id: string;
          dossier_id: string;
          inkomenscategorie: 1 | 2 | 3;
          gezamenlijk_inkomen: number;
          burgerlijke_staat: "alleenstaand" | "koppel";
          personen_ten_laste: number;
          epc_label_voor: "A" | "B" | "C" | "D" | "E" | "F" | null;
          epc_label_verwacht: "A" | "B" | "C" | null;
          woning_ouderdom: "voor_2006" | "na_2006_min_5j" | null;
          is_eigenaar: boolean;
          andere_woning_eigendom: boolean;
          is_gedomicilieerd: boolean;
          heeft_ventilatie: boolean;
          jaarverbruik_gas_kwh: number;
          jaarverbruik_elektriciteit_kwh: number;
          jaarverbruik_stookolie_liter: number;
          huidig_verwarmingstype:
            | "gas"
            | "stookolie"
            | "elektrisch"
            | "hout"
            | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["klant_parameters"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["klant_parameters"]["Row"]>;
      };
      premie_simulaties: {
        Row: {
          id: string;
          dossier_id: string;
          premies_jsonb: Json;
          totaal_premies: number;
          berekend_op: string;
          veka_verificatie_status:
            | "niet_uitgevoerd"
            | "in_uitvoering"
            | "match"
            | "verschil"
            | "fout";
          veka_verschil_notitie: string | null;
          veka_resultaat: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["premie_simulaties"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["premie_simulaties"]["Row"]>;
      };
      lening_simulaties: {
        Row: {
          id: string;
          dossier_id: string;
          type_lening: "mijnverbouwlening" | "commercieel";
          geschikt_voor_mijnverbouwlening: boolean;
          geweigerd_reden: string | null;
          rentevoet: number;
          looptijd_jaar: number;
          leenbedrag: number;
          maandelijkse_afbetaling: number;
          totale_interestkost: number;
          eigen_inbreng: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lening_simulaties"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["lening_simulaties"]["Row"]>;
      };
      besparing_simulaties: {
        Row: {
          id: string;
          dossier_id: string;
          jaarlijkse_besparing_warmtepomp: number;
          jaarlijkse_besparing_pv: number;
          jaarlijkse_besparing_batterij: number;
          totale_jaarlijkse_besparing: number;
          terugverdientijd_jaar: number | null;
          projectie_10j_jsonb: Json;
          gebruikte_energieprijzen_jsonb: Json;
          jaarlijkse_prijsstijging: number;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["besparing_simulaties"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["besparing_simulaties"]["Row"]
        >;
      };
      energieprijzen: {
        Row: {
          id: string;
          type: "elektriciteit" | "gas" | "stookolie" | "teruglevering";
          prijs_per_eenheid: number;
          eenheid: string;
          bron: "VREG" | "CREG" | "manueel";
          geldig_vanaf: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["energieprijzen"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["energieprijzen"]["Row"]>;
      };
      gegenereerde_pdfs: {
        Row: {
          id: string;
          dossier_id: string;
          type: "bank" | "klant";
          pdf_url: string;
          gegenereerd_door: string | null;
          parameters_snapshot: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["gegenereerde_pdfs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["gegenereerde_pdfs"]["Row"]>;
      };
      audit_log: {
        Row: {
          id: string;
          dossier_id: string | null;
          user_id: string | null;
          actie: string;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
      };
      teamleader_tokens: {
        Row: {
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["teamleader_tokens"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["teamleader_tokens"]["Row"]>;
      };
      settings: {
        Row: {
          id: number;
          inkomensdrempels: Json;
          commerciele_rente: number;
          wp_cop_default: number;
          jaarlijkse_prijsstijging: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
      };
    };
  };
}
