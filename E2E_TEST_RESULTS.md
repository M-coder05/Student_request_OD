# E2E Test Results

Report date: 2026-11-20
Project: Smart Student Service Portal

## Playwright E2E suite

| Item | Result |
|---|---|
| Command used | `npx playwright test --list` (discovery only) |
| Tests discovered | **9** in 1 file (`e2e/demo-logins.spec.js`) |
| Tests executed | **0** |
| Passed | **0** |
| Failed | **0** |
| Skipped | **0** |
| Status | **NOT RUN — configuration blocker** |

Blocker: `E2E_MONGO_URI` is not set. No MongoDB Atlas connection was attempted, no server was started, and no browser test was executed. No pass rate is claimed.

## Stub tests (executed successfully)

| Command | Checks | Result |
|---|---:|---|
| `node backend/scripts/testAppointments.js` | 13 | PASS |
| `node backend/scripts/testAppointmentFeatureFlag.js` | 8 | PASS |
| `node backend/scripts/testDemoAppointments.js` | 3 | PASS |
| `node backend/scripts/testAuthSecurity.js` | 5 | PASS |
| `node backend/scripts/testAnnouncements.js` | 4 | PASS |
| `node backend/scripts/testStaffDetails.js` | 8 | PASS |
| `node backend/scripts/testDepartments.js` | 5 | PASS |
| **Total** | **46** | **PASS** |

## Static checks

| Check | Result |
|---|---|
| `node --check e2e/helpers/test-environment.js` | PASS |
| `node --check e2e/global-setup.js` | PASS |
| `npm ls @playwright/test --depth=0` | PASS — `@playwright/test@1.65.0` |
| Chromium browser cache present | PASS |
| Synthetic E2E URI validation cases | PASS — 11/11 |
| `npm run client:build` | PASS |
| `git diff --check` | PASS |

## Test cases discovered but not executed

| # | Test |
|---:|---|
| 1 | login page shows enabled Student, Admin, and Faculty demo cards |
| 2 | admin login page shows only the Admin demo card |
| 3 | Student demo logs in to the dashboard with the DEMO banner |
| 4 | Admin demo logs in to the admin panel with the DEMO banner |
| 5 | Faculty demo logs in as the seeded faculty and sees three seeded appointments |
| 6 | Faculty can approve, reject, and complete demo appointments with visible status updates |
| 7 | Faculty is restricted from admin/profile/password routes and receives only demo appointments |
| 8 | Faculty demo queue excludes an appointment for a non-demo student |
| 9 | re-seeding restores the three faculty demo appointment statuses |

## To execute

Set `E2E_MONGO_URI` to a valid Atlas SRV URI for `smartStudentPortal_e2e_test`, then run:

```powershell
npm run test:e2e
```

No secrets are stored in this file.
