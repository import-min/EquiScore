/**
 * app.js — EquiScore
 * SMART on FHIR app that surfaces equity flags on clinical risk scores.
 *
 * Uses React (loaded from CDN), fhirclient.js (loaded from CDN), and
 * the scoreDatabase.js file in this same directory.
 *
 * No build step required.
 */

const { useState, useEffect, useCallback } = React;

// ── Helpers ────────────────────────────────────────────────────────────────

function getAncestryFromPatient(patient) {
  const extensions = patient.extension || [];
  let ancestryGroup = null;
  let ancestryLabel = null;

  // US Core Race Extension
  const raceExt = extensions.find(e =>
    e.url === "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race"
  );

  // US Core Ethnicity Extension
  const ethnicityExt = extensions.find(e =>
    e.url === "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity"
  );

  // Check ethnicity first - Hispanic overrides race for our purposes
  if (ethnicityExt) {
    const ombEthnicity = (ethnicityExt.extension || []).find(e => e.url === "ombCategory");
    if (ombEthnicity && ombEthnicity.valueCoding) {
      const code = ombEthnicity.valueCoding.code;
      const mapped = ETHNICITY_CODE_MAP[code];
      if (mapped) {
        ancestryGroup = mapped;
        ancestryLabel = ombEthnicity.valueCoding.display || "Hispanic or Latino";
        return { group: ancestryGroup, label: ancestryLabel, source: "ethnicity" };
      }
    }
  }

  // Then race
  if (raceExt) {
    const ombRace = (raceExt.extension || []).find(e => e.url === "ombCategory");
    if (ombRace && ombRace.valueCoding) {
      const code = ombRace.valueCoding.code;
      const mapped = RACE_CODE_MAP[code];
      if (mapped && mapped !== "OTHER") {
        ancestryGroup = mapped;
        ancestryLabel = ombRace.valueCoding.display || code;

        // Look for detailed coding within Asian
        if (mapped === "EAS" || mapped === "SAS") {
          const detailed = (raceExt.extension || []).find(e => e.url === "detailed");
          if (detailed && detailed.valueCoding) {
            const detCode = detailed.valueCoding.code;
            const detMapped = RACE_CODE_MAP[detCode];
            if (detMapped) {
              ancestryGroup = detMapped;
              ancestryLabel = detailed.valueCoding.display || ancestryLabel;
            }
          }
        }
        return { group: ancestryGroup, label: ancestryLabel, source: "race" };
      }
    }
  }

  return { group: null, label: "Not recorded", source: "none" };
}

function getRelevantScores(conditions, observations, ancestryGroup) {
  const activeConditionCodes = new Set();
  const activeConditionDisplays = [];
  const activeLabCodes = new Set();

  (conditions || []).forEach(c => {
    if (c.resource && c.resource.clinicalStatus) {
      const status = c.resource.clinicalStatus?.coding?.[0]?.code;
      if (status === "active" || status === "chronic") {
        const coding = c.resource.code?.coding || [];
        coding.forEach(code => {
          activeConditionCodes.add(code.code);
          if (code.display) activeConditionDisplays.push(code.display);
        });
      }
    }
  });

  (observations || []).forEach(o => {
    if (o.resource) {
      const coding = o.resource.code?.coding || [];
      coding.forEach(code => {
        if (code.system === "http://loinc.org") {
          activeLabCodes.add(code.code);
        }
      });
    }
  });

  const relevantScores = [];

  Object.values(SCORE_DATABASE).forEach(score => {
    let matchReason = null;

    // Check if any trigger condition matches
    const conditionMatch = score.triggerConditions.find(tc =>
      activeConditionCodes.has(tc.code)
    );
    if (conditionMatch) matchReason = `Active condition: ${conditionMatch.display}`;

    // Check if any trigger lab matches
    if (!matchReason) {
      const labMatch = score.triggerLabs.find(tl =>
        activeLabCodes.has(tl.loinc)
      );
      if (labMatch) matchReason = `Recent lab: ${labMatch.name}`;
    }

    if (matchReason) {
      const ancestryInfo = ancestryGroup
        ? (score.ancestryData[ancestryGroup] || score.ancestryData["EUR"])
        : null;

      relevantScores.push({
        score,
        matchReason,
        ancestryInfo,
        ancestryGroup
      });
    }
  });

  return relevantScores;
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Components ─────────────────────────────────────────────────────────────

function LoadingScreen({ message }) {
  return React.createElement("div", { className: "loading-screen" },
    React.createElement("div", { className: "loading-content" },
      React.createElement("div", { className: "loading-spinner" }),
      React.createElement("p", { className: "loading-message" }, message)
    )
  );
}

function ErrorScreen({ error }) {
  return React.createElement("div", { className: "error-screen" },
    React.createElement("div", { className: "error-content" },
      React.createElement("div", { className: "error-icon" }, "⚠"),
      React.createElement("h2", null, "Connection Error"),
      React.createElement("p", null, error),
      React.createElement("p", { className: "error-hint" },
        "Make sure you launched this app from a SMART sandbox. ",
        React.createElement("a", {
          href: "https://launch.smarthealthit.org/?launch_url=" + encodeURIComponent(window.location.origin + window.location.pathname.replace("index.html", "launch.html")) + "&launch=WzAsInNtYXJ0LXBhdGllbnQtbGF1bmNoLWtleSIsIiIsIiIsIiIsIiIsIiIsIiIsZmFsc2UsZmFsc2UsZmFsc2UsW10sW10sW10sMF0",
          target: "_blank"
        }, "Click here to launch from SMART sandbox")
      )
    )
  );
}

function PatientHeader({ patient, ancestry }) {
  const age = calculateAge(patient.birthDate);
  const name = patient.name?.[0];
  const fullName = name
    ? `${name.given?.join(" ") || ""} ${name.family || ""}`.trim()
    : "Unknown Patient";
  const gender = patient.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
    : "Unknown";

  return React.createElement("div", { className: "patient-header" },
    React.createElement("div", { className: "patient-avatar" },
      fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    ),
    React.createElement("div", { className: "patient-info" },
      React.createElement("h1", { className: "patient-name" }, fullName),
      React.createElement("div", { className: "patient-meta" },
        React.createElement("span", null, `${age ? age + " yrs" : "Age unknown"}`),
        React.createElement("span", { className: "separator" }, "·"),
        React.createElement("span", null, gender),
        React.createElement("span", { className: "separator" }, "·"),
        React.createElement("span", null,
          React.createElement("strong", null, "Ancestry: "),
          ancestry.label !== "Not recorded"
            ? ancestry.label
            : React.createElement("span", { className: "not-recorded" }, "Not recorded in EHR")
        )
      )
    )
  );
}

function BiasLevelBadge({ bias }) {
  const config = {
    reference: { className: "badge-reference", text: "Reference population" },
    low: { className: "badge-low", text: "Low concern" },
    moderate: { className: "badge-moderate", text: "Moderate concern" },
    significant: { className: "badge-significant", text: "Significant concern" },
    variable: { className: "badge-variable", text: "Variable — limited data" }
  };
  const { className, text } = config[bias] || config.low;
  return React.createElement("span", { className: `badge ${className}` }, text);
}

function ScoreCard({ scoreData }) {
  const { score, matchReason, ancestryInfo, ancestryGroup } = scoreData;
  const [expanded, setExpanded] = useState(false);

  const isReference = ancestryInfo?.bias === "reference";
  const hasConcern = ancestryInfo && !isReference && ancestryInfo.bias !== "low";
  const isUnknown = !ancestryGroup || ancestryGroup === "OTHER";

  let cardClass = "score-card";
  if (isUnknown) cardClass += " card-unknown";
  else if (hasConcern) cardClass += " card-concern";
  else if (isReference) cardClass += " card-reference";
  else cardClass += " card-low";

  return React.createElement("div", { className: cardClass },

    // Header
    React.createElement("div", { className: "card-header" },
      React.createElement("div", { className: "card-title-row" },
        React.createElement("h3", { className: "card-title" }, score.shortName),
        React.createElement("span", { className: "card-specialty" }, score.specialty)
      ),
      ancestryInfo && React.createElement(BiasLevelBadge, { bias: ancestryInfo.bias })
    ),

    // Match reason
    React.createElement("p", { className: "match-reason" },
      React.createElement("span", { className: "match-icon" }, "🔍"),
      " Triggered by: ", matchReason
    ),

    // Score purpose
    React.createElement("p", { className: "score-purpose" }, score.purpose),

    // Equity finding
    !isUnknown && ancestryInfo && !isReference
      ? React.createElement("div", {
          className: `equity-finding ${hasConcern ? "finding-concern" : "finding-low"}`
        },
        React.createElement("div", { className: "finding-header" },
          React.createElement("span", { className: "finding-icon" },
            hasConcern ? "⚠️" : "ℹ️"
          ),
          React.createElement("strong", null,
            hasConcern
              ? `This score may ${ancestryInfo.direction === "underestimate"
                  ? "UNDERESTIMATE" : ancestryInfo.direction === "overestimate"
                  ? "OVERESTIMATE" : "not accurately estimate"} risk for ${ancestryInfo.label} patients`
              : `Limited validation data for ${ancestryInfo.label} patients`
          )
        ),
        ancestryInfo.magnitude && React.createElement("p", { className: "finding-magnitude" },
          `Published bias: approximately `, React.createElement("strong", null, ancestryInfo.magnitude)
        ),
        React.createElement("p", { className: "finding-note" }, ancestryInfo.note)
      )
      : isUnknown
      ? React.createElement("div", { className: "equity-finding finding-unknown" },
          React.createElement("span", { className: "finding-icon" }, "ℹ️"),
          " Patient ancestry not recorded in EHR. Equity analysis requires race/ethnicity documentation using US Core standards."
        )
      : React.createElement("div", { className: "equity-finding finding-reference" },
          React.createElement("span", { className: "finding-icon" }, "✅"),
          ` This score was developed and validated primarily on ${ancestryInfo?.label || "this patient's ancestry group"}.`
        ),

    // Development cohort info
    React.createElement("div", { className: "dev-cohort" },
      React.createElement("strong", null, "Development cohort: "),
      score.devCohort.description,
      ` (${score.devCohort.percentWhite}% White, ${score.devCohort.percentBlack}% Black)`
    ),

    // Recommendation
    React.createElement("div", { className: "recommendation" },
      React.createElement("strong", null, "Clinical recommendation: "),
      score.recommendation
    ),

    // Expandable sources
    React.createElement("button", {
      className: "expand-button",
      onClick: () => setExpanded(!expanded)
    }, expanded ? "▲ Hide sources" : "▼ Show sources"),

    expanded && ancestryInfo?.sources?.length > 0 && React.createElement("div", { className: "sources" },
      React.createElement("strong", null, "Published sources:"),
      React.createElement("ul", null,
        ancestryInfo.sources.map((s, i) =>
          React.createElement("li", { key: i }, s)
        )
      )
    ),

    // Threshold context
    React.createElement("div", { className: "threshold-context" },
      React.createElement("strong", null, "Threshold context: "),
      score.clinicalThreshold.description
    )
  );
}

function NoScoresFound({ ancestry }) {
  return React.createElement("div", { className: "no-scores" },
    React.createElement("div", { className: "no-scores-icon" }, "📋"),
    React.createElement("h3", null, "No risk score triggers detected"),
    React.createElement("p", null,
      "No active conditions or recent labs in this patient's record match the trigger criteria for the clinical risk scores in our database."
    ),
    React.createElement("p", null,
      "Currently monitoring: ASCVD, HEART Score, CURB-65, Wells DVT, CHA₂DS₂-VASc"
    )
  );
}

function AncestryWarning({ ancestry }) {
  if (ancestry.group) return null;
  return React.createElement("div", { className: "ancestry-warning" },
    React.createElement("span", { className: "warning-icon" }, "⚠️"),
    React.createElement("div", null,
      React.createElement("strong", null, "Ancestry not documented"),
      React.createElement("p", null,
        "Race and ethnicity are not recorded using US Core standards in this patient's FHIR record. Equity analysis cannot be personalized. Documenting race/ethnicity using the US Core Race Extension enables this tool to provide patient-specific guidance."
      )
    )
  );
}

function SummaryBanner({ relevantScores, ancestry }) {
  const concerns = relevantScores.filter(s =>
    s.ancestryInfo?.bias === "significant" || s.ancestryInfo?.bias === "moderate"
  );

  if (concerns.length === 0) return null;

  return React.createElement("div", { className: "summary-banner" },
    React.createElement("div", { className: "banner-icon" }, "⚠️"),
    React.createElement("div", null,
      React.createElement("strong", null,
        `${concerns.length} risk score${concerns.length > 1 ? "s" : ""} flagged for ${ancestry.label} patients`
      ),
      React.createElement("p", null,
        concerns.map(c => c.score.shortName).join(", ") +
        (concerns.some(c => c.ancestryInfo?.direction === "underestimate")
          ? " — may underestimate risk. Consider adjusted thresholds."
          : " — review notes for direction of bias.")
      )
    )
  );
}

// ── Main App ───────────────────────────────────────────────────────────────

function App() {
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState(null);
  const [patient, setPatient] = useState(null);
  const [ancestry, setAncestry] = useState({ group: null, label: "Not recorded", source: "none" });
  const [relevantScores, setRelevantScores] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    FHIR.oauth2.ready()
      .then(async (client) => {
        setStatus("fetching");

        // Fetch patient
        const pt = await client.request("Patient/" + client.patient.id);
        setPatient(pt);
        const anc = getAncestryFromPatient(pt);
        setAncestry(anc);

        // Fetch conditions (active)
        let conditions = [];
        try {
          const condBundle = await client.request(
            `Condition?patient=${client.patient.id}&clinical-status=active`
          );
          conditions = condBundle.entry || [];
        } catch (e) {
          console.warn("Could not fetch conditions:", e);
        }

        // Fetch recent observations (last 90 days)
        let observations = [];
        try {
          const obsBundle = await client.request(
            `Observation?patient=${client.patient.id}&_sort=-date&_count=50`
          );
          observations = obsBundle.entry || [];
        } catch (e) {
          console.warn("Could not fetch observations:", e);
        }

        const scores = getRelevantScores(conditions, observations, anc.group);
        setRelevantScores(scores);
        setLastUpdated(new Date().toLocaleTimeString());
        setStatus("ready");
      })
      .catch((err) => {
        console.error("FHIR error:", err);
        setErrorMsg(err.message || "Failed to connect to FHIR server.");
        setStatus("error");
      });
  }, []);

  if (status === "loading" || status === "fetching") {
    return React.createElement(LoadingScreen, {
      message: status === "loading" ? "Connecting to EHR..." : "Loading patient data..."
    });
  }

  if (status === "error") {
    return React.createElement(ErrorScreen, { error: errorMsg });
  }

  return React.createElement("div", { className: "app" },

    // Top bar
    React.createElement("div", { className: "topbar" },
      React.createElement("div", { className: "topbar-brand" },
        React.createElement("span", { className: "brand-icon" }, "⚖"),
        React.createElement("span", { className: "brand-name" }, "EquiScore")
      ),
      React.createElement("div", { className: "topbar-meta" },
        lastUpdated && `Updated ${lastUpdated}`
      )
    ),

    // Main content
    React.createElement("div", { className: "main-content" },

      patient && React.createElement(PatientHeader, { patient, ancestry }),

      React.createElement(AncestryWarning, { ancestry }),

      relevantScores.length > 0 && React.createElement(SummaryBanner, { relevantScores, ancestry }),

      React.createElement("div", { className: "section-header" },
        React.createElement("h2", null, "Risk Score Equity Analysis"),
        React.createElement("p", { className: "section-subtitle" },
          relevantScores.length > 0
            ? `${relevantScores.length} relevant score${relevantScores.length > 1 ? "s" : ""} detected based on active conditions and recent labs`
            : "No relevant scores detected"
        )
      ),

      relevantScores.length > 0
        ? React.createElement("div", { className: "scores-grid" },
            relevantScores.map(sd =>
              React.createElement(ScoreCard, { key: sd.score.id, scoreData: sd })
            )
          )
        : React.createElement(NoScoresFound, { ancestry }),

      // Footer
      React.createElement("div", { className: "footer" },
        React.createElement("p", null,
          "EquiScore surfaces published equity concerns about clinical risk scores. " +
          "This tool does not replace clinical judgment. All flags are based on peer-reviewed literature."
        ),
        React.createElement("p", null,
          "Sources: Yadlowsky et al. 2018 Ann Intern Med · Backus et al. 2010 · Lim et al. 2003 Thorax · Lip et al. 2010 Chest · Wells et al. 1997"
        )
      )
    )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById("root"));
