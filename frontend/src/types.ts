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

export type ApplicationType = 'Alternance' | 'Stage';

export interface Application {
    id: string;
    user_id: string;
    company_id: string;
    date_sent: string | null;
    last_contact_date: string;
    status: ApplicationStatus;
    salary_proposed: string | null;
    type: ApplicationType;
    job_url: string | null;
    location: string | null;
    raw_description: string | null;
    is_flagged: boolean;
    company?: {
        id: string;
        user_id: string;
        name: string;
        sector: string | null;
        tech_stack?: string[];
    };
}
