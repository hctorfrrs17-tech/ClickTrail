export type Redaction = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GuideStep = {
  id: string;
  title: string;
  note: string;
  url: string;
  targetLabel: string;
  actionKind: "click" | "type";
  clickX: number;
  clickY: number;
  screenshot?: string;
  createdAt: number;
  redactions: Redaction[];
  autoRedactions: Redaction[];
};

export type Guide = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  steps: GuideStep[];
};

export type ExtensionState = {
  recording: boolean;
  recordingTabId?: number;
  recordingOrigin?: string;
  guide?: Guide;
  lastError?: string;
};

export type CapturePayload = {
  targetLabel: string;
  url: string;
  pageTitle: string;
  actionKind: "click" | "type";
  clickX: number;
  clickY: number;
  permittedText?: string;
  autoRedactions?: Redaction[];
};

export type RuntimeMessage =
  | { type: "GET_STATE" }
  | { type: "START_RECORDING"; tabId: number; tabTitle?: string }
  | { type: "STOP_RECORDING" }
  | { type: "CAPTURE_STEP"; payload: CapturePayload }
  | { type: "UPDATE_GUIDE"; guide: Guide }
  | { type: "CLEAR_GUIDE" }
  | { type: "OPEN_EDITOR" }
  | { type: "SET_RECORDING_STATE"; recording: boolean };
