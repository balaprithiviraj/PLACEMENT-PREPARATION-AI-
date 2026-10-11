# Admin Routes — merge snippet for `src/App.jsx`

> Owned by the main agent. Do NOT duplicate these routes elsewhere.
> Assumes `AdminLayout`, the four admin pages, and `ProtectedRoute adminOnly`
> already exist (created by the ADMIN+DOCS agent).

## 1. Add imports (top of `App.jsx`, next to the other page imports)

```jsx
import AdminLayout from './components/AdminLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx'; // already imported — keep one copy
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Students from './pages/admin/Students.jsx';
import Questions from './pages/admin/Questions.jsx';
import Categories from './pages/admin/Categories.jsx';
import Analytics from './pages/admin/Analytics.jsx';
```

## 2. Add the admin route block INSIDE `<Routes>` (after the student block, before `/404`)

```jsx
{/* Admin (protected, adminOnly) */}
<Route
  element={
    <ProtectedRoute adminOnly>
      <AdminLayout />
    </ProtectedRoute>
  }
>
  <Route path="/admin" element={<AdminDashboard />} />
  <Route path="/admin/students" element={<Students />} />
  <Route path="/admin/questions" element={<Questions />} />
  <Route path="/admin/categories" element={<Categories />} />
  <Route path="/admin/analytics" element={<Analytics />} />
</Route>
```

## 3. Notes for the merge

- `ProtectedRoute` with `adminOnly` redirects non-admin users to `/dashboard`
  and unauthenticated users to `/login` — no extra logic needed here.
- `AdminLayout` renders the sidebar/topbar plus `<Outlet />`; child paths above
  render inside it.
- `Categories.jsx` links to `/admin/questions?category=<name>` — the Questions
  page currently reads filters from state, so that query param is informational
  only (select the category in the filter dropdown). A follow-up can parse
  `useSearchParams` to pre-fill the filter.
- Admin API calls use the shared axios instance (`api`, default export of
  `services/api.js`) for endpoints with no named helper yet:
  `GET /users`, `GET /users/:id`, `PATCH /users/:id/status`,
  `POST/PUT/DELETE /questions`. Optional follow-up: add `adminAPI` helpers to
  `services/api.js` (owned by whoever owns that file).
