# EquiScore

A SMART on FHIR app that surfaces equity flags on clinical risk scores at the point of care.

When a clinician views a patient, EquiScore detects which clinical risk scores are relevant based on active conditions and recent labs, then shows whether those scores were validated on populations that match the patient's ancestry and if not, what the published bias direction and magnitude are.

Scores currently covered: ASCVD Pooled Cohort Equations, HEART Score, CURB-65, Wells DVT, CHA₂DS₂-VASc.

## How to test it

Go to: https://launch.smarthealthit.org

In the "App Launch URL" field, paste:
https://import-min.github.io/EquiScore/launch.html

Click "Launch". The sandbox will ask you to pick a patient. Pick any patient with conditions like hypertension, diabetes, chest pain, or pneumonia.
