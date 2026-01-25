export type TelemetryValue = string | number | boolean | null;

export type Telemetry = {
  trackEvent: (name: string, data?: Record<string, TelemetryValue>) => void;
  trackError: (name: string, error: unknown, data?: Record<string, TelemetryValue>) => void;
};

export const noopTelemetry: Telemetry = {
  trackEvent: () => {},
  trackError: () => {},
};
