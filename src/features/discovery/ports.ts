import type {
  CreateRunPayload,
  LiveAssetRow,
  LiveAuthSession,
  LiveEventRecord,
  LiveJudgeSummary,
  LivePivotRecord,
  LiveRunRecord,
  LiveTrace,
} from "./core/types";

export type Unsubscribe = () => void;

/**
 * LiveAuthDeps captures authenticated session lifecycle and auth-triggered
 * actions used by the live workspace.
 */
export interface LiveAuthDeps {
  subscribeAuth(
    onSession: (session: LiveAuthSession | null) => void,
  ): Unsubscribe;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  getIDToken(): Promise<string>;
}

/**
 * LiveRunListDeps streams the signed-in user's available runs.
 */
export interface LiveRunListDeps {
  subscribeRuns(
    ownerUID: string,
    onRuns: (runs: LiveRunRecord[]) => void,
  ): Unsubscribe;
}

/**
 * LiveRunDataDeps streams the selected run's read-model projections and
 * resolves downloadable run artifacts.
 */
export interface LiveRunDataDeps {
  subscribeAssets(
    runID: string,
    onAssets: (assets: LiveAssetRow[]) => void,
  ): Unsubscribe;
  subscribeTraces(
    runID: string,
    onTraces: (traces: LiveTrace[]) => void,
  ): Unsubscribe;
  subscribePivots(
    runID: string,
    onPivots: (pivots: LivePivotRecord[]) => void,
  ): Unsubscribe;
  subscribeJudgeSummary(
    runID: string,
    onSummary: (summary: LiveJudgeSummary) => void,
  ): Unsubscribe;
  subscribeEvents(
    runID: string,
    onEvents: (events: LiveEventRecord[]) => void,
  ): Unsubscribe;
  resolveRunArtifactURL(downloadPath: string): Promise<string>;
}

/**
 * LiveRunActionDeps mutates live backend state for runs and pivot review.
 */
export interface LiveRunActionDeps {
  createRun(payload: CreateRunPayload): Promise<LiveRunRecord>;
  decidePivot(
    runID: string,
    pivotID: string,
    decision: "accepted" | "rejected",
  ): Promise<LivePivotRecord>;
}

/**
 * LiveAppDeps preserves the app's existing top-level dependency seam while
 * exposing smaller ports for internal composition and testing.
 */
export interface LiveAppDeps
  extends LiveAuthDeps,
    LiveRunListDeps,
    LiveRunDataDeps,
    LiveRunActionDeps {}
