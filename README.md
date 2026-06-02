# hypothesis-testing
# Hypothesis Testing Tool — G11 T3 L4 (C8–C10)

## Files
| File | Purpose |
|------|---------|
| `index.html` | Main webpage (C8 + C9) |
| `styles.css` | Stylesheet |
| `app.js` | All logic (stats, drawing, CSV parsing) |
| `G11_T3_L4_C8C9_example_mean_data.csv` | Mean-based CSV example for C9 |
| `G11_T3_L4_C8C9_example_proportion_data.csv` | Proportion-based CSV example for C9 |

---

## How to open locally
1. Download all files into the **same folder**.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge).

---

## How to test C9 — CSV Mode

### Mean-based test
1. Click the **C9 · CSV Mode** tab.
2. Upload `G11_T3_L4_C8C9_example_mean_data.csv`.
3. Set **Data Type** → `Mean-based`.
4. **Group Column** → `group`, **Value Column** → `score`.
5. **Benchmark Group** → `A`, **Test Group** → `B`.
6. Choose direction (e.g. two-tailed) and α = 0.05.
7. Click **Run Hypothesis Test**.

### Proportion-based test
1. Click the **C9 · CSV Mode** tab.
2. Upload `G11_T3_L4_C8C9_example_proportion_data.csv`.
3. Set **Data Type** → `Proportion-based`.
4. **Group Column** → `group`, **Value/Success Column** → `success`.
5. **Benchmark Group** → `control`, **Test Group** → `treatment`.
6. Choose direction (e.g. right-tailed) and α = 0.05.
7. Click **Run Hypothesis Test**.

---

## Deploy to GitHub Pages
1. Create a new GitHub repository.
2. Push all files to the `main` branch.
3. Go to **Settings → Pages → Source → main / root**.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.
5. Paste that URL in the `github-link` anchor in `index.html` (line with `id="github-link"`).
