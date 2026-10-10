const margin = {top: 40, right: 80, bottom: 40, left: 220};

const svgWidth = 700;
const svgHeight = 750;

const width = svgWidth - margin.left - margin.right;
const height = svgHeight - margin.top - margin.bottom;
let allData = []
let targetYear = 2015
let categories, yAxis
const t = 1000
const token = import.meta.env.VITE_CHICAGO_APP_TOKEN

// Bar Chart
let xScale, yScale

// Stacked Bar Chart
let xScale2, colorScale


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


function init(){
    setupSelector()
    loadData()
}

window.addEventListener('load', init);

// Gets data from api and creaste visualizations
function loadData(){
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
                WHERE year = ${targetYear}
                `,
        page: {
        pageNumber: 1,
        pageSize: 486843
        },
        includeSynthetic: false
    })
    }).done(function(data) {
        allData = data
        console.log(data)
        updateAxes()
        updateStackedAxes()
        updateVis()
        updateStackedVis()

        console.log(categories)
        

    });
}

// Sets up interactive elements such a slider
function setupSelector(){
    let slider = d3
        .sliderHorizontal()
        .min(2015) 
        .max(2026) 
        .step(1)
        .width(width)  
        .displayValue(false)
        .on('onchange', (val) => {
            d3.select('#value').text(val);
            targetYear = val
            loadData()
        });

    d3.select('#slider')
        .append('svg')
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
        .sort((a, b) => d3.ascending(a.type, b.type));    

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


