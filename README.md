# EquiScore

A SMART on FHIR app that surfaces equity flags on clinical risk scores at the point of care.

When a clinician views a patient, EquiScore detects which clinical risk scores are relevant based on active conditions and recent labs, then shows whether those scores were validated on populations that match the patient's ancestry — and if not, what the published bias direction and magnitude are.

Scores currently covered: ASCVD Pooled Cohort Equations, HEART Score, CURB-65, Wells DVT, CHA₂DS₂-VASc.

## How to test it right now

You do not need to install anything. Do these steps:

**Step 1 — Enable GitHub Pages**

Go to your repo Settings → Pages → Source: Deploy from branch → Branch: main → folder: / (root) → Save.

Wait about 60 seconds. Your app will be live at:
`https://YOUR-USERNAME.github.io/EquiScore/`

**Step 2 — Launch from the SMART sandbox**

Go to: https://launch.smarthealthit.org

In the "App Launch URL" field, paste:
`https://YOUR-USERNAME.github.io/EquiScore/launch.html`

Click "Launch". The sandbox will ask you to pick a patient. Pick any patient with conditions like hypertension, diabetes, chest pain, or pneumonia — the app will work best with those.

Click "Launch App". EquiScore will open showing the patient's equity analysis.

**Step 3 — Try different patients**

The sandbox has synthetic patients with different demographics. Try patients labeled as:
- South Asian with diabetes or hypertension (will show ASCVD significant concern)
- Black patient with atrial fibrillation (will show CHA₂DS₂-VASc concern)
- East Asian patient with chest pain (will show HEART Score flag)

## What FHIR resources it uses

- `Patient` — reads name, birthdate, gender, and US Core race/ethnicity extensions
- `Condition` — reads active conditions to detect which risk scores are relevant
- `Observation` — reads recent labs (cholesterol, troponin, BUN, D-dimer) to detect relevant scores

FHIR R4. Uses SMART on FHIR for authentication. Compatible with US Core profiles.

## File structure

```
launch.html        SMART OAuth2 launch entry point
index.html         Main app
app.js             React app logic
scoreDatabase.js   Curated validation database (5 scores, 5 ancestry groups)
styles.css         Styling
```

## Evidence base

All equity findings are sourced from peer-reviewed literature:
- ASCVD: Yadlowsky et al. 2018 Ann Intern Med; MASALA cohort study; Muntner et al. 2014 JAMA
- HEART Score: Backus et al. 2010; Rodriguez et al. 2018 JAMA Cardiology
- CURB-65: Lim et al. 2003 Thorax; Marti et al. 2012 CMAJ
- CHA₂DS₂-VASc: Lip et al. 2010 Chest; Essien et al. 2020 JAMA Cardiology; Chao et al. 2016 Heart Rhythm
- Wells DVT: Wells et al. 1997 Lancet; Parpia et al. 2017 Ann Intern Med; Zakai et al. 2011

Underlying problem documented in: Obra et al. 2025 NPJ Digital Medicine (690 CDIs analyzed, 73% White development cohorts)

## Adding more scores

Edit `scoreDatabase.js`. Each score needs:
- `triggerConditions` — SNOMED/ICD codes that indicate this score is relevant
- `triggerLabs` — LOINC codes for labs that indicate this score is relevant
- `ancestryData` — per-group bias direction, magnitude, note, and sources

## Student submission

Category: Student
Primary advisor attestation required (letter from PI)
