const margin = {top: 40, right: 80, bottom: 40, left: 220};

const svgWidth = 700;
const svgHeight = 750;


const width = svgWidth - margin.left - margin.right;
const height = svgHeight - margin.top - margin.bottom;
let allData = []
let citywideYearData = [];
let targetYear = 2015
let categories, yAxis
const t = 1000
const token = import.meta.env.VITE_CHICAGO_APP_TOKEN

// trends chart
const trendWindow = 5;
let selectedCommunityArea = null;
let selectedCommunityName = null;
const trendMargin = {
    top: 20,
    right: 85,
    bottom: 65,
    left: 220
};

const trendSvgWidth = 1000;
const trendSvgHeight = 900;
const trendWidth = trendSvgWidth - trendMargin.left - trendMargin.right;
const trendHeight = trendSvgHeight - trendMargin.top - trendMargin.bottom;
let loadVersion = 0;
const stableThreshold = 1;


// map
const mapWidth = 700;
const mapHeight = 750;

let mapMetric = 'total';
let mapCrimeType =  null;
let mapAreas = null;
let mapPath = null;

// Bar Chart
let xScale, yScale

// Stacked Bar Chart
let xScale2, colorScale

let trendXScale, trendYScale;


// Create SVG for both charts
const svg1 = d3.select('#chart-one')
    .append('svg')
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const svg2 = d3.select('#chart-two')
    .append('svg')
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const svg3 = d3.select("#chart-three")
    .append("svg")
    .attr("viewBox", `0 0 ${trendSvgWidth} ${trendSvgHeight}`)
    .attr("role", "img")
    .attr("aria-label", "Change in crime share by crime type")
    .append("g")
    .attr("transform", `translate(${trendMargin.left},${trendMargin.top})`)
    .style("width", "100%")
    .style("height", "auto")
    .style("display", "block");

const mapSvg = d3.select("#chart-map")
            .append("svg")
            .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`);

function init(){
    setupSelector();
    d3.select("#reset-area").on("click", function() {
        selectedCommunityArea = null;
        selectedCommunityName = null;
        d3.select("#area").text("Chicago Overall");
        mapSvg.selectAll(".community-area")
            .classed("is-selected", false)
            .classed("is-hovered", false);
        d3.select("#map-tooltip").style("display", "none");
        d3.select(this).property("hidden", true);
        loadData();
    });
    setupMapControls();
    loadMap();
    loadData();
}

window.addEventListener('load', init);

// Gets data from api and creaste visualizations
function loadData(){
    const version = ++loadVersion;
    const year = targetYear;
    const communityArea = selectedCommunityArea;

    const geography = communityArea === null
        ? "Chicago overall"
        : `${selectedCommunityName || "Community area"} (Area ${communityArea})`;

    d3.select("#chart-one-title")
        .text(`${geography}: crime types, ${year}`);
    d3.select("#chart-two-title")
        .text(`${geography}: arrests by crime type, ${year}`);

    $.ajax({
    url: "https://data.cityofchicago.org/api/v3/views/ijzp-q8t2/query.json",
    type: "POST",
    dataType: 'json',
    headers: {
        'Content-Type': 'application/json',
        'X-App-Token': token
    },
    data: JSON.stringify({
        query: `SELECT community_area, year, primary_type, arrest
                WHERE year = ${year}
                `,
        page: {
        pageNumber: 1,
        pageSize: 486843
        },
        includeSynthetic: false
    })
    }).done(function(data) {
        if (version !== loadVersion) return;
        citywideYearData = data;
        allData = filterByCommunity(data, communityArea);

        updateAxes();
        updateStackedAxes();
        updateVis();
        updateStackedVis();
        updateMapColors();
    }).fail(function() {
        if (version !== loadVersion) return;
        console.error("Could not load selected-year crime data.");
    });

    loadTrendData(year, communityArea, version);
}

// Sets up interactive elements such a slider
function setupSelector(){
    let slider = d3
        .sliderHorizontal()
        .min(2010) 
        .max(2026) 
        .step(1)
        .default(targetYear)
        .width(width)  
        .displayValue(false)
        .on('onchange', (val) => {
            d3.select('#value').text(val);
            targetYear = val
            loadData()
        });

    d3.select('#slider')
        .append('svg')
        .attr("viewBox", `0 0 ${width + 100} 100`)
        .attr('width', width + 100)  
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)')
        .call(slider);
}

function updateAxes(){
    svg1.selectAll('.axis').remove()
    svg1.selectAll('.labels').remove()

    const countsByType = allData.reduce((acc, d) => {
        const type = d.primary_type;
        if (!acc[type]) {
            acc[type] = {
                type,
                total: 0,
                Arrests: 0,
                NonArrests: 0,
            };
        }
        acc[type].total += 1;

        if (d.arrest == true){
            acc[type].Arrests += 1;
        }else{
            acc[type].NonArrests += 1;
        }

        return acc;
    }, {});
    console.log(countsByType)
    
    categories = Object.values(countsByType)
        .sort((a, b) =>
            d3.descending(a.total, b.total) ||
            d3.ascending(a.type, b.type)
        );

    yScale = d3.scaleBand()
                .domain(categories.map(d => d.type))
                .range([0, height])
                .padding(0.2)

    yAxis = d3.axisLeft(yScale)

    svg1.append("g")
            .attr("class", "axis")
            .call(yAxis);
    

    xScale = d3.scaleSqrt()
        .domain([0, d3.max(categories, d => d.total) || 0])
        .range([0,width])
}

function updateStackedAxes(){
    svg2.selectAll('.axis').remove()
    svg2.selectAll('.labels').remove()

    colorScale = d3.scaleOrdinal()
        .domain(["Arrests", "NonArrests"])
        .range(["#e5b114", "#2c7fb8"]);

    xScale2 = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);

    svg2.append("g")
            .attr("class", "axis")
            .call(yAxis);
}

function updateVis(){
    svg1.selectAll("rect")
            .data(categories, d => d.type)
            .join(
                function(enter){
                    return enter
                    .append("rect")
                    .attr("class", "bar")
                    .attr("x", 0)
                    .attr("y", d => yScale(d.type))
                    .transition(t)
                    .attr("height", yScale.bandwidth())
                    .attr("width", d => xScale(d.total))
                },
                function(update){
                    return update
                    .attr("x", 0)
                    .attr("y", d => yScale(d.type))
                    .transition(t)
                    .attr("height", yScale.bandwidth())
                    .attr("width", d => xScale(d.total));
                },
                function(exit){
                    return exit
                    .transition(t)
                    .attr("width", 0)
                    .remove()
                }
            )

    svg1.selectAll("bar-label")
        .data(categories, d => d.type)
        .join("text")
        .attr("class", "labels")
        .attr("x", d => xScale(d.total) + 6)
        .attr("y", d => yScale(d.type) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => d3.format(".1%")(d.total / allData.length));

    const highestCount = d3.max(categories, d => d.total);
    svg1.selectAll("rect.bar")
        .classed("most-common", d => d.total === highestCount);
            
}

function updateStackedVis(){
    
    const stack = d3.stack()
        .keys(["NonArrests", "Arrests"])
        .offset(d3.stackOffsetExpand);

    const stackedData = stack(categories);

    const groups = svg2.selectAll(".stack-group")
        .data(stackedData, d => d.key)
        .join("g")
        .attr("class", "stack-group")
        .attr("fill", d => colorScale(d.key));

    groups.selectAll("rect")
        .data(d => d, d => d.data.type)
        .join(
            function(enter){
                return enter
                .append("rect")
                .attr("class","bar")
                .attr("x", d => xScale2(d[0]))
                .attr("y", d => yScale(d.data.type))
                .transition(t)
                .attr("width", d => xScale2(d[1]) - xScale2(d[0]))
                .attr("height", yScale.bandwidth());
            },
            function(update){
                return update
                .transition(t)
                .attr("x", d => xScale2(d[0]))
                .attr("y", d => yScale(d.data.type))
                .attr("width", d => xScale2(d[1]) - xScale2(d[0]))
                .attr("height", yScale.bandwidth());
            },
            function(exit){
                return exit
                .transition(t)
                .attr("width", 0)
                .remove()
            }
            
        )

   groups.each(function(series) {
    const group = d3.select(this);

    group.selectAll("segment-label")
        .data(series, d => d.data.type)
        .join("text")
        .attr("class", "labels")
        .attr("x", d => xScale2((d[0] + d[1]) / 2))
        .attr("y", d => yScale(d.data.type) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("fill", series.key === "Arrests" ? "#fff" : "#111")
        .text(d => {
        const segmentWidth = xScale2(d[1]) - xScale2(d[0]);
        return segmentWidth >= 28 ? d3.format(".0%")(d[1] - d[0]) : "";
        });
    });
}

async function loadTrendData(endYear, communityArea, version) {
    const startYear = endYear - trendWindow + 1;

    const geography = communityArea === null
        ? "Chicago overall"
        : `${selectedCommunityName || "Community area"} (Area ${communityArea})`;

    d3.select("#trend-title").text(`${geography}: change in crime share, ${startYear}-${endYear}`);

    svg3.selectAll("*").remove();

    if (endYear >= new Date().getFullYear()) {
        d3.select("#trend-status").text(
            "Select a completed year to calculate a five-year trend."
        );
        return;
    }

    d3.select("#trend-status").text("Loading trend data..");
    try {
            const rows = [];
            const pageSize = 10000;
            let pageNumber = 1;

            // Aggregate on the server rather than downloading five years
            // of individual incident records.
            while (true) {
                const page = await $.ajax({
                    url: "https://data.cityofchicago.org/api/v3/views/ijzp-q8t2/query.json",
                    type: "POST",
                    dataType: "json",
                    headers: {
                        "Content-Type": "application/json",
                        "X-App-Token": token
                    },
                    data: JSON.stringify({
                        query: `
                            SELECT year, community_area, primary_type,
                                count(*) AS incident_count
                            WHERE year BETWEEN ${startYear} AND ${endYear}
                            GROUP BY year, community_area, primary_type
                            ORDER BY year, community_area, primary_type
                        `,
                        page: {
                            pageNumber,
                            pageSize
                        },
                        includeSynthetic: false
                    })
                });

                if (version !== loadVersion) return;

                rows.push(...page);

                if (page.length < pageSize) break;
                pageNumber += 1;
            }

            const filteredRows = filterByCommunity(rows, communityArea);

            const normalizedRows = filteredRows.map(d => ({
                year: Number(d.year),
                type: d.primary_type,
                count: Number(d.incident_count)
            }));

            const totalsByYear = d3.rollup(
                normalizedRows,
                values => d3.sum(values, d => d.count),
                d => d.year
            );

            const countsByType = d3.rollup(
                normalizedRows,
                values => d3.sum(values, d => d.count),
                d => d.type,
                d => d.year
            );

            const years = d3.range(startYear, endYear + 1);

            if (years.some(year => !(totalsByYear.get(year) > 0))) {
                d3.select("#trend-status").text(
                    "Insufficient data for the full five-year window."
                );
                return;
            }

            const trends = Array.from(countsByType, ([type, counts]) => {
                const annual = years.map(year => {
                    const count = counts.get(year) || 0;

                    return {
                        year,
                        count,
                        share: 100 * count / totalsByYear.get(year)
                    };
                });

                const start = annual[0];
                const end = annual[annual.length - 1];

                return {
                    type,
                    annual,
                    start,
                    end,
                    change: end.share - start.share
                };
            }).sort(
                (a, b) =>
                    d3.descending(a.change, b.change) ||
                    d3.ascending(a.type, b.type)
            );

            updateTrendAxes(trends);
            updateTrendVis(trends);
            d3.select("#trend-status").text("");
        } catch (error) {
            if (version !== loadVersion) return;

            d3.select("#trend-status").text(
                "Could not load trend data. Try selecting the year again."
            );

            console.error("Trend data request failed:", error);
        }
}


function filterByCommunity(rows, communityArea) {
    if (communityArea === null) return rows;

    return rows.filter(
        d => Number(d.community_area) === Number(communityArea)
    );
}


function getTrendColor(change) {
    if (change > stableThreshold) return "#d97706";
    if (change < -stableThreshold) return "#2563eb";
    return "#94a3b8";
}

function getTrendStatus(change) {
    if (change > stableThreshold) return "Increasing share";
    if (change < -stableThreshold) return "Declining share";
    return "Stable share";
}


function updateTrendAxes(trends) {
    svg3.selectAll(
        ".trend-axis, .trend-grid, .trend-zero, .trend-axis-label"
    ).remove();

    const maxChange = Math.max(
        2,
        d3.max(trends, d => Math.abs(d.change)) || 0
    );

    trendXScale = d3.scaleLinear()
        .domain([-maxChange, maxChange])
        .nice()
        .range([0, trendWidth]);

    trendYScale = d3.scaleBand()
        .domain(trends.map(d => d.type))
        .range([0, trendHeight])
        .padding(0.2);

    const xAxis = d3.axisBottom(trendXScale)
                .ticks(7)
                .tickSize(-trendHeight)
                .tickFormat("")

    // Grid lines
    svg3.append("g")
        .attr("class", "trend-grid")
        .attr("transform", `translate(0,${trendHeight})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));

    svg3.append("g")
        .attr("class", "trend-axis")
        .call(d3.axisLeft(trendYScale));

    // Percentage-point axis
    svg3.append("g")
        .attr("class", "trend-axis")
        .attr("transform", `translate(0,${trendHeight})`)
        .call(
            d3.axisBottom(trendXScale)
                .ticks(7)
                .tickFormat(d => d === 0 ? "0" : d3.format("+.1f")(d))
        );

    // Zero reference line
    svg3.append("line")
        .attr("class", "trend-zero")
        .attr("x1", trendXScale(0))
        .attr("x2", trendXScale(0))
        .attr("y1", 0)
        .attr("y2", trendHeight)
        .attr("stroke", "#111")
        .attr("stroke-width", 1.5);

    svg3.append("text")
        .attr("class", "trend-axis-label")
        .attr("x", trendWidth / 2)
        .attr("y", trendHeight + 48)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .text("Change in crime share (percentage points)");
}

function updateTrendVis(trends) {
    const xScale = trendXScale;
    const yScale = trendYScale;

    const bars = svg3.selectAll(".trend-bar")
        .data(trends, d => d.type)
        .join(
            function(enter) {
                return enter
                    .append("rect")
                    .attr("class", "trend-bar")
                    .attr("x", xScale(0))
                    .attr("y", d => yScale(d.type))
                    .attr("width", 0)
                    .attr("height", yScale.bandwidth())
                    .attr("fill", d => getTrendColor(d.change))
                    .transition()
                    .duration(t)
                    .attr("x", d => xScale(Math.min(0, d.change)))
                    .attr("width", d => Math.abs(xScale(d.change) - xScale(0)));
            },
            function(update) {
                return update
                    .transition()
                    .duration(t)
                    .attr("x", d => xScale(Math.min(0, d.change)))
                    .attr("y", d => yScale(d.type))
                    .attr("width", d => Math.abs(xScale(d.change) - xScale(0)))
                    .attr("height", yScale.bandwidth())
                    .attr("fill", d => getTrendColor(d.change));
            },
            function(exit) {
                return exit
                    .transition()
                    .duration(t)
                    .attr("x", xScale(0))
                    .attr("width", 0)
                    .remove();
            }
        );
   

    // hover detail on demand
    bars.each(function(d) {
        const bar = d3.select(this);
        let title = bar.select("title");

        if (title.empty()) {
            title = bar.append("title");
        }

        title.text([
            d.type,
            getTrendStatus(d.change),
            `Window: ${d.start.year}-${d.end.year}`,
            `Start share: ${d.start.share.toFixed(2)}%`,
            `End share: ${d.end.share.toFixed(2)}%`,
            `Change: ${d3.format("+.2f")(d.change)} percentage points`,
            `Start count: ${d3.format(",")(d.start.count)}`,
            `End count: ${d3.format(",")(d.end.count)}`
        ].join("\n"));
    });

    // Signed change labels
    svg3.selectAll(".trend-value")
        .data(trends, d => d.type)
        .join(
            function(enter) {
                return enter.append("text")
                    .attr("class", "trend-value");
            },
            function(update) {
                return update;
            },
            function(exit) {
                return exit.remove();
            }
        )
        .attr("x", d => xScale(d.change) + (d.change >= 0 ? 6 : -6))
        .attr("y", d => yScale(d.type) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.change >= 0 ? "start" : "end")
        .attr("font-size", 11)
        .text(d => `${d3.format("+.2f")(d.change)} pp`);

}


// chicago map
async function loadMap() {
    try {
        const boundaries = await d3.json(
            new URL("../data/Chicago.geojson", import.meta.url).href
        );


        const projection = d3.geoMercator()
            .fitExtent(
                [[20, 20], [mapWidth - 20, mapHeight - 20]],
                boundaries
            );

        const path = d3.geoPath().projection(projection);

        if (d3.select("#map-tooltip").empty()) {
            d3.select("body")
                .append("div")
                .attr("id", "map-tooltip")
                .attr("role", "tooltip");
        }

        let mapGroup = mapSvg.select(".map-areas");
        if (mapGroup.empty()) {
            mapGroup = mapSvg.append("g")
                .attr("class", "map-areas");
        }

        const mapZoom = d3.zoom()
        .scaleExtent([1, 6])
        .on("zoom", function(event) {
            mapSvg.select(".map-areas")
                .attr("transform", event.transform);
        });

        mapSvg.call(mapZoom);

        d3.select("#zoom-in")
        .on("click", function() {
        mapSvg.transition()
            .duration(250)
            .call(mapZoom.scaleBy, 1.5);
        });

        d3.select("#zoom-out")
        .on("click", function() {
        mapSvg.transition()
            .duration(250)
            .call(mapZoom.scaleBy, 1 / 1.5);
        });

        d3.select("#reset-view")
        .on("click", function() {
        mapSvg.transition()
            .duration(250)
            .call(mapZoom.transform, d3.zoomIdentity);
        });

        mapAreas = mapGroup.selectAll(".community-area")
            .data(boundaries.features, d => d.properties.area_numbe)
            .join(
                function(enter) {
                    return enter
                        .append("path")
                        .attr("class", "community-area")
                        .attr("d", path)
                        .on("mouseover", function(event, d) {
                            
                            d3.select(this).classed("is-hovered", true);
                            const stats = getCommunityStats(d.properties.area_numbe);

                            d3.select("#map-tooltip")
                                .style("display", "block")
                                .text([
                                        `${d.properties.community} · Area ${d.properties.area_numbe}`,
                                        `${targetYear}`,
                                        "",
                                        `Reported incidents: ${d3.format(",")(stats.total)}`,
                                        `Most common: ${stats.mostCommonType} — ` +
                                            `${d3.format(",")(stats.mostCommonCount)} ` +
                                            `(${d3.format(".0%")(stats.mostCommonShare)})`,
                                        `Arrest share: ${
                                            stats.total ? d3.format(".0%")(stats.arrestShare) : "N/A"
                                        }`,
                                        "",
                                        "Click to explore this area"
                                    ].join("\n"))                                
                                .style("left", `${event.pageX + 15}px`)
                                .style("top", `${event.pageY + 15}px`);
                        })
                        .on("mouseout", function() {
                            d3.select(this).classed("is-hovered", false);
                            d3.select("#map-tooltip").style("display", "none");
                        });

                },
                function(update) {
                    return update.attr("d", path);
                },
                function(exit) {
                    return exit.remove();
                }
            ).on("click", function(event, d) {
            selectedCommunityArea = Number(d.properties.area_numbe);
            selectedCommunityName = d.properties.community;
            d3.select("#reset-area").property("hidden", false);

            d3.select("#area").text(
                `${d.properties.community} (Area ${selectedCommunityArea})`
            );

            mapGroup.selectAll(".community-area")
                .classed("is-selected", area =>
                    Number(area.properties.area_numbe) === selectedCommunityArea
                );

            d3.select(this).raise();
            d3.select("#map-tooltip").style("display", "none");

            loadData();
        });
        updateMapColors();
    } catch (error) {
        console.error("Could not load Chicago boundaries:", error);
        d3.select("#chart-map").text("Could not load the map.");
    }
}

function getCommunityStats(areaNumber) {
    const incidents = filterByCommunity(
        citywideYearData,
        Number(areaNumber)
    );

    const total = incidents.length;

    const counts = d3.rollups(
        incidents,
        rows => rows.length,
        d => d.primary_type
    ).sort(
        (a, b) =>
            d3.descending(a[1], b[1]) ||
            d3.ascending(a[0], b[0])
    );

    const mostCommon = counts[0];

    const arrests = incidents.filter(
        d => d.arrest === true || d.arrest === "true"
    ).length;

    return {
        total,
        mostCommonType: mostCommon?.[0] || "None",
        mostCommonCount: mostCommon?.[1] || 0,
        mostCommonShare: total ? mostCommon[1] / total : 0,
        arrestShare: total ? arrests / total : 0
    };
}
// Map controls

function setupMapControls() {
    d3.select("#map-metric").on("change", function () {
        mapMetric = this.value;
        const show = mapMetric === "crimeShare";
        d3.select("#map-crime").property("hidden", !show);
        d3.select("label[for=map-crime]").property("hidden", !show);
        updateMapColors();
    });

    d3.select("#map-crime").on("change", function () {
        mapCrimeType = this.value;
        updateMapColors();
    });
}


function computeAreaMetrics() {
    return d3.rollup(
        citywideYearData,
        v => {
            const total = v.length;

            const arrests = v.filter(
                d => d.arrest === true || d.arrest === 'true'
            ).length;

            const selectedCrime = v.filter(
                d => d.primary_type === mapCrimeType
            ).length;

            return {
                total,
                arrest: total ? arrests / total : 0,
                nonArrest: total ? 1 - (arrests / total) : 0,
                crimeShare: total ? selectedCrime / total : 0
            };
        },
        d => Number(d.community_area)
    );
}

// more efficient labelling
const metricConfig = {
    total: {label : "Total reported incidents", format: d3.format(",")},
    arrest: {label : "Arrest percentage", format: d3.format(".0%")},
    nonArrest: {label : "Non-arrest percentage", format: d3.format(".0%")},
    crimeShare: {label : `Selected crime share:`, format: d3.format(".1%")}
}

function updateMapColors() {
    console.log(mapAreas?.size(), mapMetric)
    if (!mapAreas) {
        return;
    }
    const metrics = computeAreaMetrics();
    const values = Array.from(metrics.values()).map(
        v => v[mapMetric]
    )
    const mapScale = d3.scaleSequential()
        .domain([0, d3.max(values) || 1])
        .interpolator(d3.interpolateBlues)

    mapAreas
        .transition()
        .duration(500)
        .style("fill", d => {
            const v = metrics.get(Number(d.properties.area_numbe))?.[mapMetric];
            return v == null ? "#eee" : mapScale(v);
        });
    
    drawLegend(mapScale, metricConfig[mapMetric])
}

function drawLegend(color, cfg) {
    const w = 240, h = 12;
    const host = d3.select("#map-legend").html("");   // clear and rebuild

    host.append("div").attr("class", "legend-title").text(cfg.label);

    const svg = host.append("svg").attr("width", w + 20).attr("height", 40);

    const gradId = "legend-gradient";
    const grad = svg.append("defs").append("linearGradient").attr("id", gradId);
    d3.range(0, 1.01, 0.1).forEach(t =>
        grad.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", color(color.domain()[0] + t * (color.domain()[1] - color.domain()[0])))
    );

    svg.append("rect").attr("x", 10).attr("width", w).attr("height", h)
        .attr("fill", `url(#${gradId})`);

    const axisScale = d3.scaleLinear().domain(color.domain()).range([10, 10 + w]);
    svg.append("g").attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(axisScale).ticks(5).tickFormat(cfg.format));
}


