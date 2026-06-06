export interface AuthBody {
  username?: string;
  password?: string;
}

export interface RechargeBody {
  providerId?: string;
  modelId?: string;
  amountPoints?: number;
  amountCents?: number;
}

export interface ReserveBody {
  estimatedPoints?: number;
  estimatedCents?: number;
  providerId?: string;
  modelId?: string;
  mediaType?: "image" | "video";
  note?: string;
}

export interface CommitBody {
  reservationId?: string;
  jobId?: string;
  mediaType?: "image" | "video";
  providerId?: string;
  modelId?: string;
  status?: string;
  chargedPoints?: number;
  chargedCents?: number;
  resultCount?: number;
  errorMessage?: string;
}

export interface CancelBody {
  reservationId?: string;
  jobId?: string;
  errorMessage?: string;
}

export interface AdminAdjustBody {
  amountPoints?: number;
  note?: string;
}
