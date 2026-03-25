import type {
  CreateRunPayload,
  LiveAssetRow,
  LiveAuthSession,
  LiveEventRecord,
  LiveJudgeSummary,
  LivePivotRecord,
  LiveRunRecord,
  LiveTrace,
} from "./types";

export type Unsubscribe = () => void;

export interface LiveAppDeps {
  subscribeAuth(
    onSession: (session: LiveAuthSession | null) => void,
  ): Unsubscribe;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  getIDToken(): Promise<string>;
  subscribeRuns(
    ownerUID: string,
    onRuns: (runs: LiveRunRecord[]) => void,
  ): Unsubscribe;
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
  createRun(payload: CreateRunPayload): Promise<LiveRunRecord>;
  decidePivot(
    runID: string,
    pivotID: string,
    decision: "accepted" | "rejected",
  ): Promise<LivePivotRecord>;
}
