export interface CourseDocument {
  id: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number | null;
  processingStatus: "uploaded" | "processing" | "ready" | "failed";
  uploadedAt: string;
}

export interface CourseDocumentsResponse {
  documents: CourseDocument[];
}
