const { useState, useEffect } = React;

// ── Ancestry detection ─────────────────────────────────────────────────────
function getAncestryFromPatient(patient) {
  const extensions = patient.extension || [];

  const ethnicityExt = extensions.find(e =>
    e.url === "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity"
  );
  if (ethnicityExt) {
    const omb = (ethnicityExt.extension || []).find(e => e.url === "ombCategory");
    if (omb?.valueCoding?.code === "2135-2") {
      return { group: "AMR", label: "Hispanic or Latino", source: "ethnicity" };
    }
  }

  const raceExt = extensions.find(e =>
    e.url === "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race"
  );
  if (raceExt) {
    const omb = (raceExt.extension || []).find(e => e.url === "ombCategory");
    if (omb?.valueCoding) {
      const code = omb.valueCoding.code;
      const mapped = RACE_CODE_MAP[code];
      if (mapped && mapped !== "OTHER") {
        let group = mapped;
        let label = omb.valueCoding.display || code;
        if (mapped === "EAS" || mapped === "SAS") {
          const det = (raceExt.extension || []).find(e => e.url === "detailed");
          if (det?.valueCoding?.code && RACE_CODE_MAP[det.valueCoding.code]) {
            group = RACE_CODE_MAP[det.valueCoding.code];
            label = det.valueCoding.display || label;
          }
        }
        return { group, label, source: "race" };
      }
    }
  }
  return { group: null, label: "Not recorded", source: "none" };
}

// ── Score matching ─────────────────────────────────────────────────────────
function getRelevantScores(conditions, observations, ancestryGroup) {
  const condCodes = new Set();
  const labCodes = new Set();

  (conditions || []).forEach(c => {
    if (c.resource) {
      const status = c.resource.clinicalStatus?.coding?.[0]?.code;
      if (!status || ["active","recurrence","relapse","chronic"].includes(status)) {
        (c.resource.code?.coding || []).forEach(cd => condCodes.add(cd.code));
      }
    }
  });

  (observations || []).forEach(o => {
    if (o.resource) {
      (o.resource.code?.coding || [])
        .filter(cd => cd.system === "http://loinc.org")
        .forEach(cd => labCodes.add(cd.code));
    }
  });

  return Object.values(SCORE_DATABASE)
    .map(score => {
      const condMatch = score.triggerConditions.find(tc => condCodes.has(tc.code));
      const labMatch  = !condMatch && score.triggerLabs.find(tl => labCodes.has(tl.loinc));
      if (!condMatch && !labMatch) return null;
      return {
        score,
        matchReason: condMatch
          ? `Active condition: ${condMatch.display}`
          : `Recent lab: ${labMatch.name}`,
        ancestryInfo: ancestryGroup
          ? (score.ancestryData[ancestryGroup] || score.ancestryData["EUR"])
          : null,
        ancestryGroup,
        allGroups: score.ancestryData
      };
    })
    .filter(Boolean);
}

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob), t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--;
  return a;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Spinner({ msg }) {
  return React.createElement("div", { className: "screen-center" },
    React.createElement("div", { className: "spinner" }),
    React.createElement("p", { className: "spinner-label" }, msg)
  );
}

function ErrorView({ error }) {
  return React.createElement("div", { className: "screen-center screen-dark" },
    React.createElement("div", { className: "error-box" },
      React.createElement("div", { className: "error-icon-ring" }, "!"),
      React.createElement("h2", null, "Connection Error"),
      React.createElement("p", null, error),
      React.createElement("a", {
        className: "relaunch-link",
        href: `https://launch.smarthealthit.org/?launch_url=${encodeURIComponent("https://import-min.github.io/EquiScore/launch.html")}`,
        target: "_blank"
      }, "Relaunch from SMART sandbox")
    )
  );
}

function PatientBar({ patient, ancestry }) {
  const age = calcAge(patient.birthDate);
  const n = patient.name?.[0];
  const name = n ? `${(n.given||[]).join(" ")} ${n.family||""}`.trim() : "Unknown";
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "—";
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return React.createElement("div", { className: "patient-bar" },
    React.createElement("div", { className: "patient-avatar" }, initials),
    React.createElement("div", { className: "patient-details" },
      React.createElement("div", { className: "patient-name" }, name),
      React.createElement("div", { className: "patient-meta" },
        [
          age ? `${age} yrs` : null,
          gender,
          ancestry.label !== "Not recorded"
            ? ancestry.label
            : React.createElement("span", { className: "ancestry-missing" }, "Ancestry not recorded")
        ]
        .filter(Boolean)
        .reduce((acc, item, i) => i === 0 ? [item] : [...acc, React.createElement("span", { key: i, className: "dot" }, "·"), item], [])
      )
    )
  );
}

function BiasPill({ bias }) {
  const map = {
    reference: ["pill-green", "Reference population"],
    low:       ["pill-blue",  "Limited data"],
    moderate:  ["pill-amber", "Moderate concern"],
    significant:["pill-red",  "Significant concern"],
    variable:  ["pill-purple","Variable — limited data"],
  };
  const [cls, text] = map[bias] || map.low;
  return React.createElement("span", { className: `pill ${cls}` }, text);
}

function ComparativeTable({ allGroups, patientGroup }) {
  const rows = Object.entries(allGroups)
    .filter(([g]) => g !== "EUR" || patientGroup !== "EUR")
    .map(([g, d]) => {
      const isPatient = g === patientGroup;
      const dirText = d.bias === "reference" ? "—"
        : d.direction === "underestimate" ? "Underestimates risk"
        : d.direction === "overestimate"  ? "Overestimates risk"
        : "Variable / unknown";
      return React.createElement("tr", { key: g, className: isPatient ? "row-highlight" : "" },
        React.createElement("td", null, d.label),
        React.createElement("td", null, React.createElement(BiasPill, { bias: d.bias })),
        React.createElement("td", null, dirText),
        React.createElement("td", null, d.magnitude || "—")
      );
    });

  return React.createElement("div", { className: "comp-table-wrap" },
    React.createElement("p", { className: "comp-label" }, "How this score performs across ancestry groups:"),
    React.createElement("table", { className: "comp-table" },
      React.createElement("thead", null,
        React.createElement("tr", null,
          ["Ancestry group", "Concern level", "Direction", "Published magnitude"]
          .map(h => React.createElement("th", { key: h }, h))
        )
      ),
      React.createElement("tbody", null, rows)
    )
  );
}

function ScoreCard({ sd }) {
  const { score, matchReason, ancestryInfo, ancestryGroup, allGroups } = sd;
  const [showSources, setShowSources] = useState(false);
  const [showTable, setShowTable]   = useState(false);

  const isRef  = ancestryInfo?.bias === "reference";
  const isUnk  = !ancestryGroup || ancestryGroup === "OTHER";
  const hasConcern = !isRef && !isUnk && (ancestryInfo?.bias === "moderate" || ancestryInfo?.bias === "significant");

  let cardMod = "";
  if (isUnk) cardMod = "card-unknown";
  else if (hasConcern) cardMod = "card-concern";
  else if (isRef) cardMod = "card-ref";
  else cardMod = "card-low";

  return React.createElement("div", { className: `card ${cardMod}` },

    React.createElement("div", { className: "card-head" },
      React.createElement("div", null,
        React.createElement("div", { className: "card-title" }, score.shortName),
        React.createElement("div", { className: "card-specialty" }, score.specialty)
      ),
      ancestryInfo && React.createElement(BiasPill, { bias: ancestryInfo.bias })
    ),

    React.createElement("div", { className: "trigger-row" },
      React.createElement("span", { className: "trigger-dot" }),
      React.createElement("span", { className: "trigger-text" }, matchReason)
    ),

    React.createElement("p", { className: "card-purpose" }, score.purpose),

    // Main finding
    !isUnk && ancestryInfo && !isRef &&
      React.createElement("div", { className: `finding finding-${hasConcern ? "concern" : "low"}` },
        React.createElement("div", { className: "finding-title" },
          hasConcern ? "Equity concern for this patient" : "Limited validation data"
        ),
        hasConcern && ancestryInfo.magnitude &&
          React.createElement("div", { className: "finding-magnitude" },
            `Estimated bias: `, React.createElement("strong", null, ancestryInfo.magnitude),
            ` — score likely `,
            React.createElement("strong", null,
              ancestryInfo.direction === "underestimate" ? "underestimates" : "overestimates"
            ),
            " risk for this patient."
          ),
        React.createElement("p", { className: "finding-note" }, ancestryInfo.note)
      ),

    isRef && React.createElement("div", { className: "finding finding-ref" },
      React.createElement("div", { className: "finding-title" }, "Development population match"),
      React.createElement("p", { className: "finding-note" },
        `${score.shortName} was developed and validated primarily on ${ancestryInfo.label} patients. Score performance should be well-calibrated for this individual.`
      )
    ),

    isUnk && React.createElement("div", { className: "finding finding-unknown" },
      React.createElement("div", { className: "finding-title" }, "Ancestry not documented"),
      React.createElement("p", { className: "finding-note" },
        "Patient ancestry is not recorded using US Core standards. Document race and ethnicity to enable patient-specific equity analysis."
      )
    ),

    // Development cohort
    React.createElement("div", { className: "meta-row" },
      React.createElement("span", { className: "meta-label" }, "Development cohort:"),
      ` ${score.devCohort.description} — ${score.devCohort.percentWhite}% White, ${score.devCohort.percentBlack}% Black`
    ),

    // Recommendation
    React.createElement("div", { className: "rec-box" },
      React.createElement("span", { className: "rec-label" }, "Recommendation"),
      React.createElement("span", null, score.recommendation)
    ),

    // Comparative table toggle
    React.createElement("button", { className: "toggle-btn", onClick: () => setShowTable(!showTable) },
      showTable ? "Hide population comparison" : "Show population comparison"
    ),
    showTable && React.createElement(ComparativeTable, { allGroups, patientGroup: ancestryGroup }),

    // Sources toggle
    React.createElement("button", { className: "toggle-btn", onClick: () => setShowSources(!showSources) },
      showSources ? "Hide sources" : "Show sources"
    ),
    showSources && ancestryInfo?.sources?.length > 0 &&
      React.createElement("div", { className: "sources-list" },
        ancestryInfo.sources.map((s, i) =>
          React.createElement("div", { key: i, className: "source-item" }, s)
        )
      ),

    React.createElement("div", { className: "threshold-row" },
      React.createElement("span", { className: "meta-label" }, "Clinical threshold:"),
      ` ${score.clinicalThreshold.description}`
    )
  );
}

function SummaryBanner({ relevantScores, ancestry }) {
  const concerns = relevantScores.filter(s =>
    s.ancestryInfo?.bias === "significant" || s.ancestryInfo?.bias === "moderate"
  );
  if (concerns.length === 0) return null;
  const dir = concerns.some(c => c.ancestryInfo?.direction === "underestimate")
    ? "may underestimate risk — consider adjusted thresholds or additional workup"
    : "require clinical review — see individual score notes";
  return React.createElement("div", { className: "banner-concern" },
    React.createElement("div", { className: "banner-indicator" }),
    React.createElement("div", null,
      React.createElement("strong", null,
        `${concerns.length} score${concerns.length > 1 ? "s" : ""} flagged for ${ancestry.label} patients`
      ),
      React.createElement("p", null,
        `${concerns.map(c => c.score.shortName).join(", ")} ${dir}.`
      )
    )
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
function App() {
  const [phase, setPhase]  = useState("loading");
  const [err,   setErr]    = useState(null);
  const [pt,    setPt]     = useState(null);
  const [anc,   setAnc]    = useState({ group: null, label: "Not recorded", source: "none" });
  const [scores,setScores] = useState([]);

  useEffect(() => {
    FHIR.oauth2.ready()
      .then(async client => {
        setPhase("fetching");
        const patient = await client.request("Patient/" + client.patient.id);
        const ancestry = getAncestryFromPatient(patient);
        setPt(patient); setAnc(ancestry);

        let conds = [], obs = [];
        try {
          const cb = await client.request(`Condition?patient=${client.patient.id}&_count=100`);
          conds = cb.entry || [];
        } catch(e) {}
        try {
          const ob = await client.request(`Observation?patient=${client.patient.id}&_sort=-date&_count=50`);
          obs = ob.entry || [];
        } catch(e) {}

        setScores(getRelevantScores(conds, obs, ancestry.group));
        setPhase("ready");
      })
      .catch(e => { setErr(e.message || String(e)); setPhase("error"); });
  }, []);

  if (phase === "loading" || phase === "fetching")
    return React.createElement(Spinner, { msg: phase === "loading" ? "Connecting to EHR..." : "Loading patient data..." });
  if (phase === "error")
    return React.createElement(ErrorView, { error: err });

  return React.createElement("div", { className: "app" },

    React.createElement("header", { className: "header" },
      React.createElement("div", { className: "header-brand" },
        React.createElement("div", { className: "brand-mark" }),
        React.createElement("span", { className: "brand-name" }, "EquiScore")
      ),
      React.createElement("div", { className: "header-sub" }, "Clinical Risk Score Equity Analysis")
    ),

    React.createElement("main", { className: "main" },

      pt && React.createElement(PatientBar, { patient: pt, ancestry: anc }),

      !anc.group && React.createElement("div", { className: "notice-missing" },
        React.createElement("strong", null, "Ancestry not documented. "),
        "Race and ethnicity are not recorded in this patient record using US Core standards. Equity analysis cannot be personalized. Documenting ancestry enables patient-specific guidance."
      ),

      scores.length > 0 && React.createElement(SummaryBanner, { relevantScores: scores, ancestry: anc }),

      React.createElement("div", { className: "section-head" },
        React.createElement("h2", null, "Detected risk scores"),
        React.createElement("p", null,
          scores.length > 0
            ? `${scores.length} score${scores.length > 1 ? "s" : ""} identified from active conditions and recent labs`
            : "No scores detected — no matching conditions or labs found in this record"
        )
      ),

      scores.length > 0
        ? React.createElement("div", { className: "cards" },
            scores.map(sd => React.createElement(ScoreCard, { key: sd.score.id, sd }))
          )
        : React.createElement("div", { className: "no-scores" },
            React.createElement("p", null, "No active conditions or recent labs in this record match the trigger criteria for ASCVD, HEART Score, CURB-65, Wells DVT, or CHA"), 
            React.createElement("span", null, "\u2082DS\u2082-VASc. Try a patient with hypertension, diabetes, chest pain, atrial fibrillation, or pneumonia.")
          ),

      React.createElement("footer", { className: "footer" },
        React.createElement("p", null,
          "EquiScore surfaces published equity evidence about clinical risk scores. This tool does not replace clinical judgment."
        ),
        React.createElement("p", null,
          "Evidence base: Yadlowsky et al. 2018 · Essien et al. 2020 · Chao et al. 2016 · Khan et al. 2022 · Mora & Libby 2022 · Parpia et al. 2017"
        )
      )
    )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById("root"));
