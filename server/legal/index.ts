import {
    CUSTOMER_TERMS_MARKDOWN,
    CUSTOMER_TERMS_VERSION,
    CUSTOMER_TERMS_LAST_UPDATED,
} from "./customerTerms";
import {
    MILKMAN_TERMS_MARKDOWN,
    MILKMAN_TERMS_VERSION,
    MILKMAN_TERMS_LAST_UPDATED,
} from "./milkmanTerms";

export type TermsRole = "customer" | "milkman";

export interface TermsDocument {
    role: TermsRole;
    version: string;
    lastUpdated: string;
    title: string;
    markdown: string;
}

export const TERMS: Record<TermsRole, TermsDocument> = {
    customer: {
        role: "customer",
        version: CUSTOMER_TERMS_VERSION,
        lastUpdated: CUSTOMER_TERMS_LAST_UPDATED,
        title: "Customer Terms & Conditions",
        markdown: CUSTOMER_TERMS_MARKDOWN,
    },
    milkman: {
        role: "milkman",
        version: MILKMAN_TERMS_VERSION,
        lastUpdated: MILKMAN_TERMS_LAST_UPDATED,
        title: "Milkman Terms & Conditions",
        markdown: MILKMAN_TERMS_MARKDOWN,
    },
};

export function isTermsRole(value: unknown): value is TermsRole {
    return value === "customer" || value === "milkman";
}

/** Current published version for a role — what a new user must accept. */
export function currentTermsVersion(role: TermsRole): string {
    return TERMS[role].version;
}
