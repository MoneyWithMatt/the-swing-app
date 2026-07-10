import type { Analysis, AppState } from "./types";

export const MATT_COACH_ID = "coach_matt";
export const DEMO_GOLFER_ID = "golfer_demo";
export const SAMPLE_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export function createDraftAnalysis(submissionId: string, coachId = MATT_COACH_ID): Analysis {
  return {
    id: `analysis_${submissionId}`,
    submissionId,
    coachId,
    status: "draft",
    summary: "Your contact gets cleaner when the takeaway stays quieter and the chest keeps turning through the ball.",
    drills: [
      "Make three slow rehearsals with the clubhead staying outside your hands.",
      "Hit five half-swings focused only on finishing balanced."
    ],
    chapters: [
      {
        id: `chapter_${submissionId}_setup`,
        title: "Setup",
        body: "You start athletic, but the ball is a fraction too far back for this swing.",
        startTime: 0,
        endTime: 3,
        annotationIds: []
      },
      {
        id: `chapter_${submissionId}_move`,
        title: "Main move",
        body: "The first move away gets a little handsy, which makes the downswing compensate.",
        startTime: 3,
        endTime: 7,
        annotationIds: []
      },
      {
        id: `chapter_${submissionId}_drill`,
        title: "One drill",
        body: "Rehearse a chest-led takeaway, pause halfway back, then turn through to a balanced finish.",
        startTime: 7,
        endTime: 12,
        annotationIds: []
      }
    ]
  };
}

export function createDefaultState(): AppState {
  return {
    coaches: [
      {
        id: MATT_COACH_ID,
        name: "Matt",
        bio: "Beginner-friendly golf coach focused on simple fixes you can take straight to the range.",
        sports: ["golf", "disc_golf"],
        pricePence: 500,
        isActive: true,
        avatarUrl: "/sample-images/golf-coach-range.png"
      }
    ],
    golfers: [
      {
        id: DEMO_GOLFER_ID,
        name: "Alex Taylor",
        email: "alex@example.com"
      }
    ],
    videoAssets: [
      {
        id: "video_demo_submitted",
        kind: "swing",
        url: SAMPLE_VIDEO_URL,
        posterUrl: "/sample-images/golf-coach-range.png",
        duration: 12,
        mimeType: "video/mp4",
        storageKind: "remote"
      },
      {
        id: "video_demo_ready",
        kind: "swing",
        url: SAMPLE_VIDEO_URL,
        posterUrl: "/sample-images/golf-coach-range.png",
        duration: 12,
        mimeType: "video/mp4",
        storageKind: "remote"
      }
    ],
    submissions: [
      {
        id: "sub_demo_submitted",
        sport: "golf",
        golferId: DEMO_GOLFER_ID,
        coachId: MATT_COACH_ID,
        question: "Why do I keep slicing my driver even when I try to swing easier?",
        videoAssetId: "video_demo_submitted",
        pricePence: 500,
        paymentStatus: "mock_authorized",
        status: "submitted",
        createdAt: new Date(Date.now() - 1000 * 60 * 34).toISOString()
      },
      {
        id: "sub_demo_ready",
        sport: "golf",
        golferId: DEMO_GOLFER_ID,
        coachId: MATT_COACH_ID,
        question: "Am I standing too close to the ball with my irons?",
        videoAssetId: "video_demo_ready",
        pricePence: 500,
        paymentStatus: "mock_authorized",
        status: "ready",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
      }
    ],
    annotations: [
      {
        id: "ann_ready_line",
        submissionId: "sub_demo_ready",
        type: "line",
        timeStart: 0,
        timeEnd: 4,
        normalizedGeometry: { x1: 0.38, y1: 0.2, x2: 0.55, y2: 0.82 },
        style: { stroke: "#f2b84b", strokeWidth: 5 },
        text: "Spine angle"
      },
      {
        id: "ann_ready_circle",
        submissionId: "sub_demo_ready",
        type: "circle",
        timeStart: 4,
        timeEnd: 8,
        normalizedGeometry: { x1: 0.42, y1: 0.42, x2: 0.64, y2: 0.66 },
        style: { stroke: "#5ba86c", fill: "rgba(91, 168, 108, 0.12)", strokeWidth: 4 },
        text: "Hands"
      }
    ],
    analyses: [
      {
        ...createDraftAnalysis("sub_demo_ready"),
        status: "sent",
        sentAt: new Date(Date.now() - 1000 * 60 * 42).toISOString()
      }
    ]
  };
}
