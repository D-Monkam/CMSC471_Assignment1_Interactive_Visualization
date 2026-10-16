# Map color encoding ("View Map By") checklist

## 1. Controls (index.html)

- [X] Add `<select id="map-metric">` with options: total, arrest, nonArrest, crimeShare
- [X] Add `<select id="map-crime">` (hidden unless metric is crimeShare) + its label
- [X] Add `<div id="map-legend">` in the map section

## 2. State and aggregation (script.js)

- [X] Add `mapMetric`, `mapCrimeType`, `mapAreas`, `mapPath` variables
- [X] Write `computeAreaMetrics()` using one `d3.rollup` over `citywideYearData`
  - [X] Returns Map(areaNumber -> {total, arrest, nonArrest, crimeShare})
  - [X] Areas with total 0 handled as "no data"

## 3. Color scale and recolor

- [X] Add `metricConfig` (label + format per metric)
- [X] Write `updateMapColors()` with `d3.scaleSequential(d3.interpolateBlues)`
  - [X] Domain computed from current data ([0, max] or extent)
  - [X] Grey fallback for no data
  - [X] Use `.style("fill", ...)`, not `.attr`
- [ ] Check if skewed counts need sqrt/quantile scale or a raised light end

## 4. Legend

- [X] Write `drawLegend(color, cfg)`: gradient bar + axis + title
- [ ] Legend rebuilds whenever metric (or data/year) changes
- [ ] Add "No data" swatch

## 5. Selection styling (CSS)

- [ ] Remove any `fill` from `.community-area`, `.is-hovered`, `.is-selected`
- [ ] Selection = thick non-blue stroke; hover = thinner dark stroke
- [ ] Confirm selected area stays on top (`raise()`)

## 6. Wiring

- [ ] In `loadMap`: store join in `mapAreas`, `mapPath = path`, call `updateMapColors()`
- [ ] In `loadData().done`: populate crime dropdown, call `updateMapColors()`
- [ ] Handle race: `updateMapColors()` returns early if map not loaded; both paths call it
- [ ] `#map-metric` change handler (toggle crime dropdown visibility)
- [ ] `#map-crime` change handler
- [ ] Default crime type chosen on first load

## 7. Polish

- [ ] Tooltip shows value of the current metric
- [ ] `aria-label` describing the current metric on the map
- [ ] (Optional) Avoid refetching the year on area click; re-filter cached data
- [ ] Test: every metric, year slider, area selection, reset, zoom
