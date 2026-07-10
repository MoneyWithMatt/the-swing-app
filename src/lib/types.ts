export type Sport = "golf" | "disc_golf";

export type PaymentStatus = "mock_authorized" | "captured" | "refunded";

export type SubmissionStatus = "submitted" | "in_review" | "ready";

export type VideoStorageKind = "remote" | "local_data_url" | "session_object_url";

export type AnnotationType = "line" | "arrow" | "circle" | "angle" | "text";

export type AnalysisStatus = "draft" | "sent";

export type Point = {
  x: number;
  y: number;
};

export type NormalizedGeometry = {
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  x3?: number;
  y3?: number;
};

export type AnnotationStyle = {
  stroke: string;
  fill?: string;
  strokeWidth: number;
};

export type Coach = {
  id: string;
  name: string;
  bio: string;
  sports: Sport[];
  pricePence: number;
  isActive: boolean;
  avatarUrl?: string;
};

export type Golfer = {
  id: string;
  name: string;
  email: string;
};

export type VideoAsset = {
  id: string;
  kind: "swing" | "analysis_narration";
  url: string;
  posterUrl?: string;
  duration?: number;
  mimeType: string;
  storageKind: VideoStorageKind;
};

export type Submission = {
  id: string;
  sport: Sport;
  golferId: string;
  coachId: string;
  question: string;
  videoAssetId: string;
  pricePence: number;
  paymentStatus: PaymentStatus;
  status: SubmissionStatus;
  createdAt: string;
};

export type Annotation = {
  id: string;
  submissionId: string;
  type: AnnotationType;
  timeStart: number;
  timeEnd: number;
  normalizedGeometry: NormalizedGeometry;
  style: AnnotationStyle;
  text?: string;
};

export type AnalysisChapter = {
  id: string;
  title: string;
  body: string;
  startTime: number;
  endTime: number;
  annotationIds: string[];
};

export type Analysis = {
  id: string;
  submissionId: string;
  coachId: string;
  chapters: AnalysisChapter[];
  summary: string;
  drills: string[];
  narrationAssetId?: string;
  status: AnalysisStatus;
  sentAt?: string;
};

export type AppState = {
  coaches: Coach[];
  golfers: Golfer[];
  videoAssets: VideoAsset[];
  submissions: Submission[];
  annotations: Annotation[];
  analyses: Analysis[];
};

export type NewSubmissionInput = {
  question: string;
  videoUrl: string;
  videoMimeType: string;
  videoStorageKind: VideoStorageKind;
  videoDuration?: number;
};
