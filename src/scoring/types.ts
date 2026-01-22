export type ParsedJobCard = {
  title: string;
  company: string;
  locationText: string;
  jobUrl: string;
};

export type ScoreResult =
  | {
      status: "unknown";
      reason: string;
    }
  | {
      status: "ok";
      jobPostcode: string;
    };
