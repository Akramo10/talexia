export type ApplicationStatus = 'Wishlist' | 'Applied' | 'Follow-up' | 'Interview' | 'Technical Test' | 'Rejected' | 'Offer';

export const COLUMNS: { id: ApplicationStatus; title: string }[] = [
    { id: 'Wishlist', title: 'LISTE DE SOUHAITS' },
    { id: 'Applied', title: 'POSTULÉ' },
    { id: 'Follow-up', title: 'RELANCE' },
    { id: 'Interview', title: 'ENTRETIEN' },
    { id: 'Technical Test', title: 'TEST TECHNIQUE' },
    { id: 'Offer', title: 'OFFRE' },
    { id: 'Rejected', title: 'REFUSÉ' },
];

export type ApplicationType = 'Stage' | 'Alternance' | 'CDI' | 'CDD' | 'Freelance' | 'Temps partiel' | 'Temps plein' | 'Interim';

export type DocumentType = 'CV' | 'Lettre motivation' | 'Portfolio' | 'Certificat' | 'Autre';

export interface AppDocument {
    id: string;
    user_id: string;
    application_id: string | null;
    original_filename: string;
    stored_filename: string | null;
    s3_key: string;
    file_url: string | null;
    document_type: DocumentType;
    mime_type: string;
    size: number;
    display_name: string;
    tags: string | null;
    created_at: string;
    updated_at: string;
}

export interface Application {
    id: string;
    user_id: string;
    company_id: string;
    date_sent: string | null;
    last_contact_date: string;
    status: ApplicationStatus;
    job_title: string | null;
    salary_proposed: string | null;
    type: ApplicationType;
    job_url: string | null;
    location: string | null;
    contract_type: string | null;
    remote_mode: string | null;
    publication_date: string | null;
    scraped_at: string | null;
    raw_description: string | null;
    is_flagged: boolean;
    cv_document_id: string | null;
    cover_letter_document_id: string | null;
    cv_document?: AppDocument | null;
    cover_letter_document?: AppDocument | null;
    company?: {
        id: string;
        user_id: string;
        name: string;
        sector: string | null;
        tech_stack?: string[];
    };
}
