addMdToPage(`# Samband mellan medelinkomst och vinnande parti
  - en jämförelse mellan 2018 och 2022`);


dbQuery.use('kommun-info-mongodb');
let incomeRawData = await dbQuery.collection('incomeByKommun').find({});
//console.log('raw income data from mongodb', incomeRawData);

//sort raw data by kommun name
incomeRawData.sort((a, b) => {
  const kommunCompare = a.kommun.localeCompare(b.kommun);
  if (kommunCompare !== 0) return kommunCompare;
  return a.kon.localeCompare(b.kon);
});
//console.log('raw income data in asc by kommun name', incomeRawData);


//only keep the income data for gender == 'totalt' and year 2018 and 2022
let incomeDataForChart = incomeRawData.filter(x => x.kon == 'totalt')
.map(x => ({
  kommun:x.kommun,
  medelInkomst2018:x.medelInkomst2018,
  medelInkomst2022:x.medelInkomst2022
}));

//console.log('incomeDataForChart',incomeDataForChart);
//tableFromData({data:incomeDataForChart});

//console.log('sammanstallning',sammanstallning);


const merged = incomeDataForChart.map(incomeItem => {
  const match = sammanstallning.find(e => e.kommun === incomeItem.kommun);
  return {
    ...incomeItem,
    vinnare2018: match?.vinnare2018 || null,
    vinnare2022: match?.vinnare2022 || null
  };
});

//console.log('merged',merged);


// Match party name to number & colour
const partyMap = {};
const partyColors = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4'];
let partyIndex = 0;

function getPartyInfo(party) {
  if (!(party in partyMap)) {
    partyMap[party] = {
      index: partyIndex,
      color: partyColors[partyIndex % partyColors.length]
    };
    partyIndex++;
  }
  return partyMap[party];
}

// build array data for 2018
const scatterData2018 = [
  ['MedelInkomst', 'Party Index', { type: 'string', role: 'tooltip' }, { role: 'style' }],
  ...merged.map(item => {
    const partyInfo = getPartyInfo(item.vinnare2018);
    return [
      item.medelInkomst2018,
      partyInfo.index,
      item.vinnare2018,
      `color: ${partyInfo.color}`
    ];
  })
];

// build array data for 2022
const scatterData2022 = [
  ['MedelInkomst', 'Party Index', { type: 'string', role: 'tooltip' }, { role: 'style' }],
  ...merged.map(item => {
    const partyInfo = getPartyInfo(item.vinnare2022);
    return [
      item.medelInkomst2022,
      partyInfo.index,
      item.vinnare2022,
      `color: ${partyInfo.color}`
    ];
  })
];


//const container = document.getElementById('scatter_chart2018_div');
//console.log('container',container);

// draw scatter chart using Google Charts 
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(drawCharts);


function drawCharts() {
  drawScatterChart(scatterData2018, 'scatter_chart2018_div', '2018 MedelInkomst vs Vinnande Parti');
  drawScatterChart(scatterData2022, 'scatter_chart2022_div', '2022 MedelInkomst vs Vinnande Parti');
}

function drawScatterChart(dataArray, containerId, chartTitle) {
  const data = google.visualization.arrayToDataTable(dataArray);

  const options = {
    title: chartTitle,
    hAxis: {
      title: 'MedelInkomst (TSEK)',
      viewWindow: {
        min: 0,
        max: 700
      }
    },
    vAxis: {
      title: 'Vinnande Parti',
      ticks: Object.entries(partyMap).map(([party, info]) => ({ v: info.index, f: party }))
    },
    legend: 'none',
    tooltip: { isHtml: true },
    //width: 800,
    height: 450
  };

  const chart = new google.visualization.ScatterChart(document.getElementById(containerId));
  chart.draw(data, options);
}


addMdToPage(`# slutsatser
Diagrammen ovan visar relationen mellan medelinkomst (TSEK) och vilket parti som vann i olika områden under valåren 2018 och 2022. Tre huvudmönster framträder tydligt:

1. Socioekonomisk förankring av partierna
Socialdemokraterna (röd markör) vann framförallt i områden med lägre medelinkomst, ofta under 400 TSEK. 
Moderaterna (grön) dominerade i områden med medel till hög medelinkomst,
 medan Sverigedemokraterna (gul) hade starkast stöd i områden med låg till medelhög inkomstnivå, ofta mellan 250 och 350 TSEK.

2. Stabilitet över tid
Mönstret är i stort sett oförändrat mellan 2018 och 2022.
Detta antyder att inkomstnivåns koppling till partisympati har varit stabil under perioden.

3. Partispecifika inkomstspann
Varje partis stöd är koncentrerat till olika inkomstnivåer.
 Det tyder på att ekonomiska förhållanden har fortsatt starkt samband med politiska preferenser, 
 vilket är särskilt tydligt i den relativa separationen mellan Socialdemokraternas och Moderaternas väljarbaser.

Sammantaget visar analysen att inkomstnivån är en avgörande faktor för vilket parti som vinner i ett visst område, och att detta mönster är bestående över tid.
`);