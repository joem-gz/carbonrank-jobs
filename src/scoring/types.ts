export type ParsedJobCard = {
  title: string;
  company: string;
  locationText: string;
  jobUrl: string;
};

export type GeocodeResult = {
  latitude: number;
  longitude: number;
};

export type ScoreBreakdown = {
  distanceKm: number;
  officeDaysPerWeek: number;
  annualKm: number;
  emissionFactorKgPerKm: number;
  annualKgCO2e: number;
};

export type ScoreResult =
  | {
      status: "set_postcode";
    }
  | {
      status: "wfh";
      breakdown: ScoreBreakdown;
      reason: string;
    }
  | {
      status: "no_data";
      reason: string;
    }
  | {
      status: "loading";
    }
  | {
      status: "ok";
      breakdown: ScoreBreakdown;
      placeName: string;
    }
  | {
      status: "error";
      reason: string;
    };
