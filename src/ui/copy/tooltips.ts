export const TOOLTIP_COPY = {
  sic: {
    label: "SIC codes",
    description:
      "SIC codes are the UK Standard Industrial Classification used to map an employer to a sector baseline.",
    ariaLabel: "About SIC codes",
  },
  sbti: {
    label: "SBTi",
    description:
      "SBTi indicates whether the employer has a public climate commitment or target. It is not a footprint measure.",
    ariaLabel: "About SBTi status",
  },
  sectorBaseline: {
    label: "Sector baseline",
    description:
      "Sector baseline is an ONS industry average emissions intensity, not a company-specific footprint.",
    ariaLabel: "About sector baseline",
  },
} as const;
