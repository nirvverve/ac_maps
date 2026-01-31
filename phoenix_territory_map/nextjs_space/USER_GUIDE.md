# User Guide — Territory Map Admin

> Amenity Pool Services — Territory Data Visualization Tools

## Signing in

1. Navigate to the app URL and you will be redirected to `/login`.
2. Enter your email and password.
3. If this is your first time, go to `/register` instead — you will
   receive a 6-digit verification code by email (valid 15 minutes),
   then set a password (min 9 characters, 1 uppercase, 1 special char).

### User roles

| Role | Badge | Access |
|------|-------|--------|
| **ADMIN** | Red | All views, user management, data upload, scenario editing |
| **LEVEL2** | Blue | Standard views + employee locations |
| **LEVEL1** | Green | Standard views only |

---

## Dashboard overview

After login you land on the main dashboard. The top bar shows:

- **Location selector** — switch between Arizona, Miami, Dallas,
  Orlando, Jacksonville, Port Charlotte. The choice persists in the URL.
- **View buttons** — color-coded tabs to switch between map views.
- **User info** — your email, role badge, sign-out button, and
  (for admins) a "Manage Users" link.

---

## Map views

### Territory

Color-coded ZIP code polygons showing which territory each ZIP belongs
to. Toggle individual territories on/off with the legend checkboxes.

### Density

Heat map of account counts per ZIP. Use the mode selector to show
Active, Terminated, Lifetime, or Both. Switch between Residential and
Commercial account types where available.

### Revenue

Revenue analysis by territory and ZIP code.

### Routes

Route assignments by technician and territory. Shows markers for route
stops and connecting lines.

### Customer lookup

Search for an individual customer by name or account number. The map
zooms to the matching address and shows account details.

### Market size

Total addressable market (TAM) estimates per ZIP code.

### Employees

(Requires LEVEL2+) Office and field employee locations.

### Commercial / Ancillary sales

Commercial account locations and ancillary service revenue data.

### Scenario builder

(Admin only — see §Scenarios below.)

---

## Admin panel (`/admin`)

### Managing users

1. Go to `/admin` (or click "Manage Users" in the top bar).
2. The user list shows email, role, registration status, and creation
   date.
3. To add a user, fill in their email, pick a role, and click
   **Add User**. They will appear as "Pending" until they register.
4. Send the new user the app URL — they will register at `/register`.

### Uploading data

1. Click **Upload Data** on the admin panel (or go to `/admin/upload`).
2. Pick a **location** and **data type** from the dropdowns.

   Supported data types:
   - Territory Assignments
   - Account Density
   - Customer Data
   - Revenue Data
   - Route Data
   - Employee Data
   - Commercial Accounts
   - Ancillary Sales
   - Market Size

3. Options:
   - **Create backup** (on by default) — saves the current data before
     overwriting.
   - **Geocode missing coordinates** — if records have addresses but no
     lat/lng, the server will geocode them via Google.

4. Drag-and-drop (or browse) a CSV or XLSX file (max 10 MB).
5. Click **Upload Data**.
6. The result screen shows record count, validation errors (if any),
   and geocoding stats.

After upload the new data is immediately available in the corresponding
map view.

---

## Scenarios

The Scenario Builder lets admins model "what if" territory
reassignments.

### Creating a scenario

1. Switch to the **Scenarios** view.
2. Select **New Scenario (Draft)** from the scenario dropdown.
3. Click a ZIP code polygon on the map to select it.
4. Use the territory dropdown in the details panel to reassign the ZIP.
5. The **Impact Summary** updates in real time:
   - Reassignment count
   - Accounts impacted
   - Revenue delta
   - Per-territory breakdown

### Comparing scenarios

1. Open the comparison dropdown and pick a second scenario.
2. The panel shows side-by-side deltas: account changes and revenue
   impact per territory.

### Scenario statuses

| Status | Meaning |
|--------|---------|
| Draft | Work-in-progress, editable |
| Published | Finalized, visible to all users |
| Archived | Historical, hidden by default |

---

## Tips

- **URL sharing** — the location and view are encoded in the URL
  (`?location=miami`), so you can share a direct link to any view.
- **Filters reset** when you switch locations but persist while
  switching between views within the same location.
- **Rate limits** — uploads are limited to 5 per minute; ZIP boundary
  lookups to 30 per minute. If you see a 429 error, wait and retry.
- **Data refresh** — after a pipeline run (see `pipeline/README.md`),
  upload the new JSON/CSV files via the admin upload page or copy them
  to the `public/` directory and redeploy.
