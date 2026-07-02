export interface AuthBody {
  accountId?: string;
  username?: string;
  password?: string;
}

export interface RechargeBody {
  providerId?: string;
  modelId?: string;
  amountPoints?: number;
  amountCents?: number;
  planId?: string;
  planName?: string;
  rechargeKind?: "points" | "monthly";
  note?: string;
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

export interface FeedbackBody {
  message?: string;
  contact?: string;
  appVersion?: string;
  userAgent?: string;
}

export interface AdminAdjustBody {
  amountPoints?: number;
  note?: string;
}

export interface AdminResetPasswordBody {
  password?: string;
}
