# Char Dham Pilgrimage Travel Survey — v2

A browser-based survey instrument for studying travel behaviour, transport preferences, and service quality perceptions of pilgrims on the Char Dham Yatra (Yamunotri · Gangotri · Kedarnath · Badrinath) in Uttarakhand, India.

Developed at the **Transportation Simulation Lab (TSim Lab)**, Department of Civil Engineering, IIT Roorkee, under Prof. Amit Agarwal.

---

## Purpose

The survey collects primary data on:

- Trip planning and party composition
- Physical mobility and health status of pilgrims
- Main-haul and last-mile transport mode choices
- Stated preferences across service attributes (Discrete Choice Experiment)
- Accommodation and halt patterns along the route
- Satisfaction ratings for transport and facilities
- Socio-demographic profile of respondents

Data are used to calibrate agent-based and discrete choice transport models for the Char Dham corridor.

---

## Structure

```
CharDhamSurvey-v2/
├── index.html          # Survey form (all sections, single page)
├── script.js           # Navigation, validation, conditional logic, data submission
├── style.css           # Styling and responsive layout
├── images/             # Header banner and transport-mode illustrations
├── automation_bot/     # Node.js bot for automated data processing / sheet updates
├── tests/              # Unit tests (respondent fatigue heuristics)
└── backups/            # Pre-refactor snapshots
```

## Survey Sections

| Section | Content |
|---------|---------|
| A1 | Trip planning — party type, starting point, mobility & health |
| A2 | Visit history and frequency per Dham |
| A2.1 | Previous transport experience |
| B | Main-haul transport — mode, satisfaction, ratings |
| C | Last-mile transport to each shrine |
| D | Discrete Choice Experiment (DCE) — attribute importance and trade-offs |
| E | Accommodation and halts |
| F | Overall feedback and socio-demographics |

---

## Running the Survey

No build step is required. Open `index.html` in any modern browser:

```
# Clone the repo
git clone https://github.com/anujn08/Chardham_Travel_Survey.git

# Open directly
start index.html        # Windows
open index.html         # macOS
```

Responses are submitted to a **Google Sheet** via a Google Apps Script web app endpoint configured inside `script.js`.

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript — no frameworks or build tools
- Inline SVG pictogram icons for mobility and health condition scales
- Conditional form logic for group vs. solo travel scenarios
- Google Sheets as the data backend

---

## Contact

Anuj Nautiyal · anuj_n@ce.iitr.ac.in  
TSim Lab, Dept. of Civil Engineering, IIT Roorkee
