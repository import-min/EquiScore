/**
 * scoreDatabase.js
 *
 * Curated database of clinical risk scores and their known
 * performance gaps across ancestry groups.
 *
 * Each entry contains:
 *   - name, description, specialty
 *   - devCohort: who the score was developed on
 *   - triggerConditions: SNOMED/ICD codes that suggest this score is relevant
 *   - triggerLabs: LOINC codes for labs that suggest this score is relevant
 *   - ancestryData: per-group bias direction, magnitude, and source
 *
 * Sources:
 *   ASCVD: Yadlowsky et al. 2018 Ann Intern Med; MASALA study (Goff et al. 2014)
 *   Framingham: D'Agostino et al. 2008 Circulation
 *   HEART: Brady et al. 2019 Heart; Mahler et al. 2017
 *   CURB-65: Lim et al. 2003 Thorax
 *   Wells DVT: Wells et al. 1997; Parpia et al. 2017
 *   CHA2DS2-VASc: Olesen et al. 2011; limited diversity data
 */

const SCORE_DATABASE = {

  ascvd: {
    id: "ascvd",
    name: "ASCVD Pooled Cohort Equations",
    shortName: "ASCVD 10-yr Risk",
    specialty: "Cardiology / Primary Care",
    purpose: "Estimates 10-year risk of atherosclerotic cardiovascular disease",
    devCohort: {
      description: "ARIC, CHS, CARDIA, and Framingham Heart Study cohorts",
      percentWhite: 78,
      percentBlack: 22,
      percentOther: 0,
      note: "Originally published with separate equations for White and Black patients only. No South Asian, East Asian, or Hispanic-specific equations."
    },
    triggerConditions: [
      { system: "http://snomed.info/sct", code: "44054006", display: "Diabetes mellitus type 2" },
      { system: "http://snomed.info/sct", code: "38341003", display: "Hypertension" },
      { system: "http://snomed.info/sct", code: "59621000", display: "Essential hypertension" },
      { system: "http://snomed.info/sct", code: "13644009", display: "Hypercholesterolaemia" },
      { system: "http://snomed.info/sct", code: "55822004", display: "Hyperlipidemia" },
      { system: "http://snomed.info/sct", code: "370992007", display: "Dyslipidemia" },
      { system: "http://hl7.org/fhir/sid/icd-10", code: "I10", display: "Essential hypertension" },
      { system: "http://hl7.org/fhir/sid/icd-10", code: "E11", display: "Type 2 diabetes" }
    ],
    triggerLabs: [
      { loinc: "2093-3", name: "Total cholesterol" },
      { loinc: "2085-9", name: "HDL cholesterol" },
      { loinc: "13457-7", name: "LDL cholesterol" },
      { loinc: "8480-6", name: "Systolic blood pressure" }
    ],
    ancestryData: {
      EUR: {
        label: "European / White",
        bias: "reference",
        direction: null,
        magnitude: null,
        adjustedMultiplier: 1.0,
        note: "Development population. Equations were calibrated on this group.",
        sources: ["Goff DC Jr et al. 2014 Circulation"]
      },
      AFR: {
        label: "African / Black",
        bias: "moderate",
        direction: "underestimate",
        magnitude: "10-15%",
        adjustedMultiplier: 1.12,
        note: "Separate Black-race equations were included in the original model. However external validation studies show these still underestimate events in Black women and overestimate in some Black men. The net direction for Black patients overall is underestimation of true risk.",
        sources: ["Khan SS et al. 2022 Circulation", "Essien UR et al. 2021 JAMA Cardiology", "Muntner P et al. 2014 JAMA"]
      },
      SAS: {
        label: "South Asian",
        bias: "significant",
        direction: "underestimate",
        magnitude: "30-50%",
        adjustedMultiplier: 1.40,
        note: "South Asian individuals have significantly higher cardiovascular risk than the Pooled Cohort Equations predict. The MASALA study found that standard ASCVD calculators underestimate 10-year risk for South Asians. South Asians have higher rates of insulin resistance and central adiposity not captured by standard risk factors.",
        sources: ["Mora S & Libby P 2022 NEJM - PREVENT calculator", "Kanaya AM et al. 2021 MASALA updated", "Yadlowsky S et al. 2018 Ann Intern Med", "Volgman AS et al. 2021 J Am Coll Cardiol"]
      },
      EAS: {
        label: "East Asian",
        bias: "moderate",
        direction: "overestimate",
        magnitude: "20-40%",
        adjustedMultiplier: 0.75,
        note: "The Pooled Cohort Equations may overestimate 10-year cardiovascular risk in East Asian individuals. Multiple validation studies in Chinese, Japanese, and Korean populations found the PCE predicts more events than actually occur. Applying PCE thresholds could lead to overtreatment with statins in this group.",
        sources: ["Grundy SM et al. 2019 J Am Coll Cardiol - ACC/AHA guideline", "Yadlowsky S et al. 2018 Ann Intern Med", "Kwan TW et al. 2020 Am J Cardiol"]
      },
      AMR: {
        label: "Hispanic / Latino",
        bias: "moderate",
        direction: "overestimate",
        magnitude: "20-30%",
        adjustedMultiplier: 0.80,
        note: "The PCE was noted to overestimate risk in Hispanic/Latino populations in several external validation studies. The ASCVD Risk Estimator+ now includes a disclaimer that it may overestimate risk in Mexican Americans and underestimate in Puerto Ricans. The variation within Hispanic subgroups is large.",
        sources: ["Navar AM et al. 2021 J Am Heart Assoc", "Yadlowsky S et al. 2018 Ann Intern Med"]
      }
    },
    clinicalThreshold: {
      highRisk: 7.5,
      unit: "%",
      description: "ACC/AHA guideline threshold for statin initiation discussion"
    },
    recommendation: "Consider the PREVENT calculator (AHA 2023) which was developed on a more diverse cohort. For South Asian patients, lower treatment thresholds are recommended by some guidelines."
  },

  heart: {
    id: "heart",
    name: "HEART Score",
    shortName: "HEART Score",
    specialty: "Emergency Medicine / Cardiology",
    purpose: "Risk stratifies chest pain patients for major adverse cardiac events (MACE)",
    devCohort: {
      description: "Dutch emergency department cohorts",
      percentWhite: 92,
      percentBlack: 3,
      percentOther: 5,
      note: "Developed and primarily validated in predominantly White European populations."
    },
    triggerConditions: [
      { system: "http://snomed.info/sct", code: "29857009", display: "Chest pain" },
      { system: "http://snomed.info/sct", code: "57676002", display: "Joint pain" },
      { system: "http://hl7.org/fhir/sid/icd-10", code: "R07", display: "Pain in throat and chest" }
    ],
    triggerLabs: [
      { loinc: "6598-7", name: "Troponin T" },
      { loinc: "10839-9", name: "Troponin I" },
      { loinc: "49563-0", name: "High-sensitivity troponin I" }
    ],
    ancestryData: {
      EUR: {
        label: "European / White",
        bias: "reference",
        direction: null,
        magnitude: null,
        adjustedMultiplier: 1.0,
        note: "Development and primary validation population.",
        sources: ["Backus BE et al. 2010 Neth Heart J"]
      },
      AFR: {
        label: "African / Black",
        bias: "significant",
        direction: "variable",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Black patients presenting with chest pain have been shown to receive less aggressive workup in emergency settings. The HEART score has limited validation in Black populations. Troponin assay reference ranges used in the score were established largely on White European populations and may not apply equally.",
        sources: ["Rodriguez F et al. 2021 JAMA Cardiology - racial disparities in chest pain workup", "Mahler SA et al. 2017 Circ Cardiovasc Qual Outcomes"]
      },
      SAS: {
        label: "South Asian",
        bias: "moderate",
        direction: "underestimate",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "South Asian patients have higher rates of atypical presentations of ACS and higher underlying coronary disease burden. The HEART score history component may systematically underweight risk in this population. No large validation study in South Asian ED populations exists.",
        sources: ["Joshi P et al. 2007 Lancet", "Bhopal RS 2013 Heart"]
      },
      EAS: {
        label: "East Asian",
        bias: "low",
        direction: "unknown",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Limited validation data in East Asian populations. One validation study in Taiwan showed comparable performance but with possible underestimation in younger patients.",
        sources: ["Poldervaart JM et al. 2017 Ann Emerg Med"]
      },
      AMR: {
        label: "Hispanic / Latino",
        bias: "low",
        direction: "unknown",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Limited validation data in Hispanic/Latino populations specifically. One US multicenter study included diverse patients but did not stratify by Hispanic subgroup.",
        sources: ["Mahler SA et al. 2017 Circ Cardiovasc Qual Outcomes"]
      }
    },
    clinicalThreshold: {
      highRisk: 7,
      unit: "points",
      description: "Score >= 7 indicates high risk; score 0-3 is low risk"
    },
    recommendation: "Use clinical judgment alongside HEART score for patients from populations with limited validation data. Consider lower threshold for admission in South Asian patients with chest pain given higher underlying coronary risk."
  },

  curb65: {
    id: "curb65",
    name: "CURB-65",
    shortName: "CURB-65",
    specialty: "Pulmonology / Emergency Medicine / Internal Medicine",
    purpose: "Predicts 30-day mortality in community-acquired pneumonia to guide admission decisions",
    devCohort: {
      description: "UK and New Zealand hospital cohorts",
      percentWhite: 88,
      percentBlack: 4,
      percentOther: 8,
      note: "Developed on predominantly British cohorts. Most external validation has been performed in European and North American populations."
    },
    triggerConditions: [
      { system: "http://snomed.info/sct", code: "233604007", display: "Pneumonia" },
      { system: "http://snomed.info/sct", code: "87628006", display: "Bacterial infectious disease" },
      { system: "http://hl7.org/fhir/sid/icd-10", code: "J18", display: "Pneumonia, unspecified organism" },
      { system: "http://hl7.org/fhir/sid/icd-10", code: "J15", display: "Unspecified bacterial pneumonia" }
    ],
    triggerLabs: [
      { loinc: "3094-0", name: "Blood urea nitrogen" },
      { loinc: "8480-6", name: "Systolic blood pressure" },
      { loinc: "8867-4", name: "Heart rate" },
      { loinc: "9279-1", name: "Respiratory rate" }
    ],
    ancestryData: {
      EUR: {
        label: "European / White",
        bias: "reference",
        direction: null,
        magnitude: null,
        adjustedMultiplier: 1.0,
        note: "Development and primary validation population.",
        sources: ["Lim WS et al. 2003 Thorax"]
      },
      AFR: {
        label: "African / Black",
        bias: "moderate",
        direction: "underestimate",
        magnitude: "15-25%",
        adjustedMultiplier: 1.20,
        note: "Studies in sub-Saharan African populations show CURB-65 has lower discriminatory ability. Higher rates of comorbidities like HIV and TB in African populations are not captured by the score. In US settings, Black patients with pneumonia are more likely to be undertreated even when severity is equivalent.",
        sources: ["Garin N et al. 2022 BMC Pulm Med", "Torres A et al. 2021 Lancet Respir Med", "Marti C et al. 2012 CMAJ"]
      },
      SAS: {
        label: "South Asian",
        bias: "low",
        direction: "unknown",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Limited validation data specific to South Asian populations. One study in India found CURB-65 performed adequately but with lower NPV in the highest severity group.",
        sources: ["Jayakar R et al. 2019 Indian J Chest Dis"]
      },
      EAS: {
        label: "East Asian",
        bias: "low",
        direction: "overestimate",
        magnitude: "10-15%",
        adjustedMultiplier: 0.90,
        note: "Several validation studies in East Asian populations (China, Taiwan, South Korea) show CURB-65 tends to overestimate severity. Lower body weight norms mean BUN thresholds may not apply equally. PSI may be more accurate in East Asian patients.",
        sources: ["Shindo Y et al. 2009 Respir Med", "Eom JS et al. 2011 Respirology"]
      },
      AMR: {
        label: "Hispanic / Latino",
        bias: "low",
        direction: "unknown",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Limited population-specific validation data. Overall CURB-65 performance in diverse US hospital cohorts appears acceptable but subgroup analyses for Hispanic patients specifically are sparse.",
        sources: ["Aujesky D et al. 2005 Am J Med"]
      }
    },
    clinicalThreshold: {
      highRisk: 3,
      unit: "points",
      description: "Score >= 3: severe pneumonia, consider ICU. Score 2: short inpatient admission. Score 0-1: outpatient treatment may be appropriate."
    },
    recommendation: "For African and Black patients with pneumonia, consider that CURB-65 may underestimate severity. HIV status, nutritional status, and social circumstances should be weighted alongside the score."
  },

  wells_dvt: {
    id: "wells_dvt",
    name: "Wells Score for DVT",
    shortName: "Wells DVT",
    specialty: "Internal Medicine / Emergency Medicine / Vascular Surgery",
    purpose: "Pre-test probability of deep vein thrombosis",
    devCohort: {
      description: "Canadian outpatient and emergency department cohorts",
      percentWhite: 91,
      percentBlack: 5,
      percentOther: 4,
      note: "Developed and primarily validated in Canadian populations which are predominantly White."
    },
    triggerConditions: [
      { system: "http://snomed.info/sct", code: "128053003", display: "Deep venous thrombosis" },
      { system: "http://snomed.info/sct", code: "95482003", display: "Swelling of lower limb" },
      { system: "http://hl7.org/fhir/sid/icd-10", code: "I82", display: "Deep vein thrombosis" }
    ],
    triggerLabs: [
      { loinc: "3255-7", name: "D-dimer" }
    ],
    ancestryData: {
      EUR: {
        label: "European / White",
        bias: "reference",
        direction: null,
        magnitude: null,
        adjustedMultiplier: 1.0,
        note: "Development population.",
        sources: ["Wells PS et al. 1997 Lancet"]
      },
      AFR: {
        label: "African / Black",
        bias: "significant",
        direction: "underestimate",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Black individuals have higher baseline D-dimer levels independent of thrombosis, which complicates D-dimer-based rule-out strategies that are coupled with the Wells score. There is also evidence of higher VTE risk in Black patients that may not be fully captured by the Wells clinical criteria alone.",
        sources: ["Zakai NA et al. 2021 Blood - VTE disparities updated", "Parpia S et al. 2017 Ann Intern Med", "Smith NL et al. 2022 J Thromb Haemost"]
      },
      SAS: {
        label: "South Asian",
        bias: "low",
        direction: "unknown",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Limited data specific to South Asian populations. Generally considered applicable but formal validation is sparse.",
        sources: ["Tan M et al. 2012 Thromb Haemost"]
      },
      EAS: {
        label: "East Asian",
        bias: "low",
        direction: "unknown",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Limited validation in East Asian populations specifically.",
        sources: []
      },
      AMR: {
        label: "Hispanic / Latino",
        bias: "low",
        direction: "unknown",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Limited population-specific data.",
        sources: []
      }
    },
    clinicalThreshold: {
      highRisk: 3,
      unit: "points",
      description: "Score >= 3: high probability DVT. Score 1-2: moderate. Score <= 0: low."
    },
    recommendation: "For Black patients, be cautious about D-dimer-based DVT rule-out as baseline D-dimer levels are higher in this population. A negative D-dimer may be less reassuring."
  },

  chadsvasc: {
    id: "chadsvasc",
    name: "CHA\u2082DS\u2082-VASc Score",
    shortName: "CHA\u2082DS\u2082-VASc",
    specialty: "Cardiology / Internal Medicine",
    purpose: "Stroke risk in atrial fibrillation to guide anticoagulation decisions",
    devCohort: {
      description: "European registry and trial populations with atrial fibrillation",
      percentWhite: 94,
      percentBlack: 3,
      percentOther: 3,
      note: "Developed on predominantly European cohorts with atrial fibrillation."
    },
    triggerConditions: [
      { system: "http://snomed.info/sct", code: "49436004", display: "Atrial fibrillation" },
      { system: "http://hl7.org/fhir/sid/icd-10", code: "I48", display: "Atrial fibrillation and flutter" }
    ],
    triggerLabs: [],
    ancestryData: {
      EUR: {
        label: "European / White",
        bias: "reference",
        direction: null,
        magnitude: null,
        adjustedMultiplier: 1.0,
        note: "Development and primary validation population.",
        sources: ["Lip GY et al. 2010 Chest"]
      },
      AFR: {
        label: "African / Black",
        bias: "significant",
        direction: "underestimate",
        magnitude: "20-30%",
        adjustedMultiplier: 1.25,
        note: "Black patients with atrial fibrillation have higher stroke rates than CHA2DS2-VASc predicts, even at low score values. This has led some investigators to suggest lower anticoagulation thresholds for Black patients. The higher burden of hypertension and underlying stroke risk factors is not fully captured by the score's weighting.",
        sources: ["Essien UR et al. 2020 JAMA Cardiology", "Magnani JW et al. 2022 JACC - race and AF outcomes", "Navar AM et al. 2021 J Am Heart Assoc"]
      },
      SAS: {
        label: "South Asian",
        bias: "moderate",
        direction: "underestimate",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "South Asian patients with AF have higher stroke rates driven by higher rates of diabetes and hypertension. Limited formal validation data exists but clinical concern is underestimation.",
        sources: ["Piccini JP et al. 2013 Circulation"]
      },
      EAS: {
        label: "East Asian",
        bias: "moderate",
        direction: "overestimate",
        magnitude: "10-20%",
        adjustedMultiplier: 0.85,
        note: "Several studies in East Asian populations find CHA2DS2-VASc overestimates stroke risk, potentially leading to overanticoagulation and increased bleeding risk. Some investigators recommend modified thresholds for East Asian patients.",
        sources: ["Chao TF et al. 2022 Thromb Haemost", "Chao TF et al. 2016 Heart Rhythm", "Lip GY et al. 2021 Eur Heart J"]
      },
      AMR: {
        label: "Hispanic / Latino",
        bias: "low",
        direction: "unknown",
        magnitude: "unknown",
        adjustedMultiplier: null,
        note: "Limited validation data specifically for Hispanic/Latino populations with AF.",
        sources: ["Naccarelli GV et al. 2018 Am J Cardiol"]
      }
    },
    clinicalThreshold: {
      highRisk: 2,
      unit: "points",
      description: "Men score >= 2 or women score >= 3: anticoagulation recommended by AHA/ACC guidelines"
    },
    recommendation: "For Black patients with AF, consider that CHA2DS2-VASc may underestimate stroke risk. Some experts recommend anticoagulation at lower score thresholds. For East Asian patients, bleeding risk should be carefully weighed as the score may overestimate stroke risk."
  }

};

// Race/ethnicity code mappings
// US Core race extension codes to our internal ancestry group labels
const RACE_CODE_MAP = {
  // OMB codes (US Core uses these)
  "1002-5": "AMR",   // American Indian or Alaska Native - mapped to AMR as closest
  "2028-9": "EAS",   // Asian - mapped to EAS (will refine with detailed codes)
  "2054-5": "AFR",   // Black or African American
  "2076-8": "AMR",   // Native Hawaiian or Other Pacific Islander
  "2106-3": "EUR",   // White
  "2131-1": "OTHER", // Other Race

  // Detailed Asian codes
  "2034-7": "EAS",   // Chinese
  "2036-2": "EAS",   // Filipino
  "2039-6": "EAS",   // Japanese
  "2040-4": "EAS",   // Korean
  "2046-1": "EAS",   // Vietnamese
  "2029-7": "SAS",   // Asian Indian
  "2037-0": "SAS",   // Bangladeshi (mapped to SAS)
  "2038-8": "SAS",   // Pakistani (mapped to SAS)

  // Hispanic/Latino (ethnicity, not race - handled separately)
  "2135-2": "AMR",   // Hispanic or Latino
  "2186-5": "EUR",   // Not Hispanic or Latino (stays as race-based)

  // SNOMED codes sometimes used
  "413490006": "AFR", // African race
  "413441008": "EAS", // East Asian race
  "413464008": "EUR", // Caucasian race
};

const ETHNICITY_CODE_MAP = {
  "2135-2": "AMR",   // Hispanic or Latino
  "2186-5": null,    // Not Hispanic or Latino
};

// LOINC codes for common risk-relevant observations
const RELEVANT_LOINC_CODES = new Set([
  "2093-3",   // Total cholesterol
  "2085-9",   // HDL
  "13457-7",  // LDL
  "8480-6",   // Systolic BP
  "8462-4",   // Diastolic BP
  "6598-7",   // Troponin T
  "10839-9",  // Troponin I
  "49563-0",  // hs-Troponin I
  "3094-0",   // BUN
  "3255-7",   // D-dimer
  "8867-4",   // Heart rate
  "9279-1",   // Respiratory rate
  "2345-7",   // Glucose
  "4548-4",   // HbA1c
  "33914-3",  // eGFR
]);

if (typeof module !== 'undefined') {
  module.exports = { SCORE_DATABASE, RACE_CODE_MAP, ETHNICITY_CODE_MAP, RELEVANT_LOINC_CODES };
}
