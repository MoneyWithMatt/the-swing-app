import { handleCoachRecording } from "@/lib/server/coach-recordings";

export async function POST(request: Request) {
  return handleCoachRecording(request, {
    idField: "analysisId",
    table: "coach_analyses",
    storageFolder: "workspace-results",
    notFoundMessage: "Private analysis not found for this coach."
  });
}
