export interface ZoningAdvice {
  title: string;
  message: string;
  basis: string;
  tone: "context" | "review" | "attention";
}

const SOURCE = "Kilimani zoning guidelines v2 · planning guidance only";

export function getZoningAdvice({
  landUse,
  parcelAreaM2,
  footprintAreaM2,
  floors,
  floorAreaM2,
  riverBufferOverlap,
  roadDistanceM,
}: {
  landUse: string | null;
  parcelAreaM2: number;
  footprintAreaM2: number;
  floors: number;
  floorAreaM2: number;
  riverBufferOverlap: boolean | null;
  roadDistanceM: number | null;
}): ZoningAdvice[] {
  const advice: ZoningAdvice[] = [];
  const normalizedUse = landUse?.toLowerCase() ?? "";
  const coverage =
    parcelAreaM2 > 0 ? (footprintAreaM2 / parcelAreaM2) * 100 : null;
  const plotRatio = parcelAreaM2 > 0 ? floorAreaM2 / parcelAreaM2 : null;

  if (
    normalizedUse.includes("residential") ||
    normalizedUse.includes("mixed")
  ) {
    if (parcelAreaM2 > 0 && parcelAreaM2 < 450) {
      advice.push({
        title: "Plot-size review",
        message:
          "The selected parcel is below the 450 m² high-density / mixed-density reference threshold in the guide. Review the applicable local zoning context before relying on this scenario.",
        basis: SOURCE,
        tone: "review",
      });
    }
    if (coverage != null && coverage > 70) {
      advice.push({
        title: "Coverage review",
        message: `The proposed footprint is ${coverage.toFixed(1)}% of the parcel. This is above the guide's 70% high-density residential reference coverage; professional review is required.`,
        basis: SOURCE,
        tone: "attention",
      });
    }
    if (plotRatio != null && plotRatio > 8) {
      advice.push({
        title: "Intensity review",
        message: `The indicative plot ratio is ${plotRatio.toFixed(1)}. The guide references a 1:5 to 1:8 range for high-density residential development; this is a planning prompt, not a compliance conclusion.`,
        basis: SOURCE,
        tone: "review",
      });
    }
    if (coverage != null && coverage <= 70) {
      advice.push({
        title: "Open-site context",
        message: `The indicative footprint is within the guide's 70% high-density residential coverage reference. Confirm setbacks, access, parking, greening, and approvals separately.`,
        basis: SOURCE,
        tone: "context",
      });
    }
  }

  if (normalizedUse.includes("commercial") || normalizedUse.includes("mixed")) {
    if (coverage != null && coverage > 80) {
      advice.push({
        title: "Commercial coverage review",
        message: `The proposed footprint is ${coverage.toFixed(1)}% of the parcel, above the guide's 80% commercial reference coverage. Review the site layout and open-space requirements.`,
        basis: SOURCE,
        tone: "attention",
      });
    }
    if (roadDistanceM != null && roadDistanceM > 100) {
      advice.push({
        title: "Access context",
        message:
          "The selected parcel is more than 100 m from the nearest mapped road feature in the current dataset. Confirm actual frontage, road reserve width, and access design with a professional planner.",
        basis: SOURCE,
        tone: "review",
      });
    }
  }

  if (floors > 4) {
    advice.push({
      title: "Wastewater review",
      message:
        "The scenario exceeds four floors. The guide identifies public sewer or an approved decentralized wastewater approach as a matter for professional infrastructure review; this simulator cannot assess capacity.",
      basis: SOURCE,
      tone: "review",
    });
  }
  if (riverBufferOverlap) {
    advice.push({
      title: "Riparian spatial sensitivity",
      message:
        "The proposed footprint intersects the mapped 15 m river buffer. The attached guide references a wider river reserve context; review the applicable environmental and planning requirements. This is not an automatic legal determination.",
      basis: SOURCE,
      tone: "attention",
    });
  }
  if (
    footprintAreaM2 > 0 &&
    parcelAreaM2 > 0 &&
    footprintAreaM2 / parcelAreaM2 < 0.1
  ) {
    advice.push({
      title: "Greening / open area prompt",
      message:
        "The scenario leaves substantial open surface. Consider how the guide's soft-landscaping and stormwater expectations could be represented in a site plan.",
      basis: SOURCE,
      tone: "context",
    });
  }
  if (!advice.length)
    advice.push({
      title: "Planning context",
      message:
        "No guide-based prompt was triggered by the available parcel attributes and scenario inputs. This is not a compliance assessment; continue professional planning review.",
      basis: SOURCE,
      tone: "context",
    });
  return advice;
}
