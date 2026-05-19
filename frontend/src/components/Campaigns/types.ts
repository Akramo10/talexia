export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type LogLevel = 'info' | 'success' | 'error' | 'warning';

export interface Recipient {
  id: string;
  campaign_id: string;
  email: string;
  company_name: string | null;
  contact_name: string | null;
  status: RecipientStatus;
  sent_at: string | null;
  error_message: string | null;
}

export interface Attachment {
  id: string;
  campaign_id: string;
  user_id: string | null;
  original_filename: string | null;
  s3_key: string | null;
  mime_type: string | null;
  size: number | null;
  file_name: string;
  file_path: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  send_delay_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  recipients: Recipient[];
  attachments: Attachment[];
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  skipped_count: number;
}

export interface CampaignLog {
  id: string;
  campaign_id: string;
  level: LogLevel;
  message: string;
  recipient_id: string | null;
  created_at: string;
}
