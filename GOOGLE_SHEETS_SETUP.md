# Google Sheets setup for the v2 survey

1. Open the fresh Google Sheet.
2. Choose **Extensions → Apps Script**.
3. Replace everything in `Code.gs` with the complete contents of `google_apps_script.gs` from this project and save.
4. Choose **Deploy → New deployment → Web app**.
5. Set **Execute as** to **Me** and access to **Anyone**, then deploy and authorize it.
6. Copy the deployed URL ending in `/exec`.
7. Open that `/exec` URL in a browser. It should return JSON containing `"result":"success"` and the v2 endpoint message.
8. Put that new URL into the `scriptUrl` used by `handleFormSubmit()` in `script.js`. The old deployment URL currently begins at line 2955.
9. Send one synthetic response with the automation bot in **Fill + Google Sheet + Local** mode. Search `Sheet1` for its `SYN_...` marker in `feedbackOther`.

Do not run the Apps Script `doPost` function directly from the editor: it requires the web-app POST event. Test through the survey or bot.

The script creates these tabs automatically on the first response:

- `Sheet1`: complete raw wide response; new future field names are added automatically.
- `RawOrdered`: complete raw response with the current question families ordered first.
- `ResponseFields`: every response in long format (`responseId`, field name, value number, value). This prevents future questions from disappearing from modelling data.
- `Respondents`: demographics, group, planning, mobility, attitudes, priorities and feedback.
- `DhamVisits`: one row per selected Dham.
- `MainHaulSegments` and `MainHaulTransfers`.
- `InterDhamSegments` and `InterDhamTransfers`.
- `ReturnSegments`.
- `Stopovers`.
- `LastMileTrips`: includes Kedarnath access, helicopter, stay and return fields.
- `ServiceEvaluations`.
- `ChoiceResponses`: one row per DCE task answer.

The script uses a lock to prevent simultaneous submissions from writing over one another. Its header migration keeps existing values aligned by column name if normalized columns are added later.

The destination is explicitly fixed by `SPREADSHEET_ID` near the top of the script. It currently points to spreadsheet `12VtOBJ8uUp1hFmc1JyQbblZz9zOJAuyzddgfWpsOwYw`, preventing a standalone or incorrectly bound deployment from writing into another spreadsheet.
