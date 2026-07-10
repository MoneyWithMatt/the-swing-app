"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDefaultState, createDraftAnalysis, DEMO_GOLFER_ID, MATT_COACH_ID } from "./mock-data";
import type {
  Analysis,
  Annotation,
  AppState,
  NewSubmissionInput,
  Submission,
  SubmissionStatus,
  VideoAsset
} from "./types";

const STORAGE_KEY = "the-swing-app-state-v1";

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AppState>;
  return (
    Array.isArray(candidate.coaches) &&
    Array.isArray(candidate.golfers) &&
    Array.isArray(candidate.videoAssets) &&
    Array.isArray(candidate.submissions) &&
    Array.isArray(candidate.annotations) &&
    Array.isArray(candidate.analyses)
  );
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}_${Date.now().toString(36)}`;
}

function loadState(): AppState {
  if (typeof window === "undefined") {
    return createDefaultState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createDefaultState();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isAppState(parsed) ? parsed : createDefaultState();
  } catch {
    return createDefaultState();
  }
}

function persistState(state: AppState) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Large uploaded videos can exceed localStorage; the in-memory state still supports the demo session.
    }
  }
}

export function useSwingStore() {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const stateRef = useRef<AppState>(state);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    stateRef.current = loaded;
    setState(loaded);
    setHydrated(true);
  }, []);

  const commit = useCallback((updater: (current: AppState) => AppState) => {
    const next = updater(cloneState(stateRef.current));
    stateRef.current = next;
    persistState(next);
    setState(next);
  }, []);

  const resetDemo = useCallback(() => {
    const next = createDefaultState();
    stateRef.current = next;
    persistState(next);
    setState(next);
  }, []);

  const createSubmission = useCallback(
    (input: NewSubmissionInput) => {
      const submissionId = createId("sub");
      const videoAssetId = createId("video");
      const videoAsset: VideoAsset = {
        id: videoAssetId,
        kind: "swing",
        url: input.videoUrl,
        duration: input.videoDuration,
        mimeType: input.videoMimeType,
        storageKind: input.videoStorageKind
      };
      const submission: Submission = {
        id: submissionId,
        sport: "golf",
        golferId: DEMO_GOLFER_ID,
        coachId: MATT_COACH_ID,
        question: input.question,
        videoAssetId,
        pricePence: 500,
        paymentStatus: "mock_authorized",
        status: "submitted",
        createdAt: new Date().toISOString()
      };

      commit((current) => ({
        ...current,
        videoAssets: [videoAsset, ...current.videoAssets],
        submissions: [submission, ...current.submissions]
      }));

      return submissionId;
    },
    [commit]
  );

  const updateSubmissionStatus = useCallback(
    (submissionId: string, status: SubmissionStatus) => {
      commit((current) => ({
        ...current,
        submissions: current.submissions.map((submission) =>
          submission.id === submissionId ? { ...submission, status } : submission
        )
      }));
    },
    [commit]
  );

  const addAnnotation = useCallback(
    (annotation: Omit<Annotation, "id">) => {
      const newAnnotation: Annotation = {
        ...annotation,
        id: createId("ann")
      };

      commit((current) => ({
        ...current,
        annotations: [...current.annotations, newAnnotation]
      }));

      return newAnnotation.id;
    },
    [commit]
  );

  const deleteAnnotation = useCallback(
    (annotationId: string) => {
      commit((current) => ({
        ...current,
        annotations: current.annotations.filter((annotation) => annotation.id !== annotationId),
        analyses: current.analyses.map((analysis) => ({
          ...analysis,
          chapters: analysis.chapters.map((chapter) => ({
            ...chapter,
            annotationIds: chapter.annotationIds.filter((id) => id !== annotationId)
          }))
        }))
      }));
    },
    [commit]
  );

  const upsertAnalysis = useCallback(
    (analysis: Analysis) => {
      commit((current) => {
        const existing = current.analyses.some((item) => item.id === analysis.id);
        return {
          ...current,
          analyses: existing
            ? current.analyses.map((item) => (item.id === analysis.id ? analysis : item))
            : [...current.analyses, analysis]
        };
      });
    },
    [commit]
  );

  const saveAnalysisRecording = useCallback(
    (
      submissionId: string,
      recording: {
        url: string;
        mimeType: string;
        duration?: number;
      }
    ) => {
      const recordingAssetId = createId("recording");

      commit((current) => {
        const submission = current.submissions.find((item) => item.id === submissionId);
        const existing = current.analyses.find((analysis) => analysis.submissionId === submissionId);
        const draft = existing ?? createDraftAnalysis(submissionId, submission?.coachId ?? MATT_COACH_ID);
        const videoAsset: VideoAsset = {
          id: recordingAssetId,
          kind: "analysis_recording",
          url: recording.url,
          duration: recording.duration,
          mimeType: recording.mimeType,
          storageKind: "session_object_url"
        };
        const nextAnalysis: Analysis = {
          ...draft,
          narrationAssetId: recordingAssetId
        };

        return {
          ...current,
          videoAssets: [videoAsset, ...current.videoAssets],
          analyses: existing
            ? current.analyses.map((analysis) =>
                analysis.submissionId === submissionId ? nextAnalysis : analysis
              )
            : [...current.analyses, nextAnalysis]
        };
      });

      return recordingAssetId;
    },
    [commit]
  );

  const ensureDraftAnalysis = useCallback(
    (submissionId: string, coachId = MATT_COACH_ID) => {
      const existing = state.analyses.find((analysis) => analysis.submissionId === submissionId);
      if (existing) {
        return existing;
      }

      const draft = createDraftAnalysis(submissionId, coachId);
      upsertAnalysis(draft);
      return draft;
    },
    [state.analyses, upsertAnalysis]
  );

  const sendAnalysis = useCallback(
    (submissionId: string) => {
      commit((current) => {
        const submission = current.submissions.find((item) => item.id === submissionId);
        const existing = current.analyses.find((analysis) => analysis.submissionId === submissionId);
        const draft = existing ?? createDraftAnalysis(submissionId, submission?.coachId ?? MATT_COACH_ID);
        const sentAnalysis: Analysis = {
          ...draft,
          status: "sent",
          sentAt: new Date().toISOString()
        };

        return {
          ...current,
          submissions: current.submissions.map((item) =>
            item.id === submissionId ? { ...item, status: "ready" } : item
          ),
          analyses: existing
            ? current.analyses.map((analysis) =>
                analysis.submissionId === submissionId ? sentAnalysis : analysis
              )
            : [...current.analyses, sentAnalysis]
        };
      });
    },
    [commit]
  );

  const selectors = useMemo(
    () => ({
      getCoach: (id: string) => state.coaches.find((coach) => coach.id === id),
      getGolfer: (id: string) => state.golfers.find((golfer) => golfer.id === id),
      getVideo: (id: string) => state.videoAssets.find((video) => video.id === id),
      getSubmission: (id: string) => state.submissions.find((submission) => submission.id === id),
      getAnnotationsForSubmission: (submissionId: string) =>
        state.annotations.filter((annotation) => annotation.submissionId === submissionId),
      getAnalysisForSubmission: (submissionId: string) =>
        state.analyses.find((analysis) => analysis.submissionId === submissionId)
    }),
    [state]
  );

  return {
    state,
    hydrated,
    resetDemo,
    createSubmission,
    updateSubmissionStatus,
    addAnnotation,
    deleteAnnotation,
    upsertAnalysis,
    saveAnalysisRecording,
    ensureDraftAnalysis,
    sendAnalysis,
    ...selectors
  };
}
