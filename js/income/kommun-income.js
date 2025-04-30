addMdToPage("### medel- och medianInkomst per kommun - från 2018 till 2022");

dbQuery.use('kommun-info-mongodb');
let income = await dbQuery.collection('incomeByKommun').find({});
//console.log('income from mongodb', income);

let incomeDataForTable = income.map(x =>({
    kommun: x.kommun,
    kön: x.kon,
    medelInkomst2018:x.medelInkomst2018,
    medelInkomst2019:x.medelInkomst2019,
    medelInkomst2020:x.medelInkomst2020,
    medelInkomst2021:x.medelInkomst2021,
    medelInkomst2022:x.medelInkomst2022,
    medianInkomst2018:x.medianInkomst2018,
    medianInkomst2019:x.medianInkomst2019,
    medianInkomst2020:x.medianInkomst2020,
    medianInkomst2021:x.medianInkomst2021,
    medianInkomst2022:x.medianInkomst2022
}));

//incomeDataForTable = incomeDataForTable.filter(x => x.kommun === 'Huddinge');

incomeDataForTable.sort((a, b) => {
  const kommunCompare = a.kommun.localeCompare(b.kommun);
  if (kommunCompare !== 0) return kommunCompare;
  return a.kön.localeCompare(b.kön);
});

//console.log('income for table', incomeDataForTable)

//tableFromData({data:incomeDataForTable});


let totaltIncome = incomeDataForTable.filter(x=>x.kön ==='totalt')
.map(x=>({
  kommun: x.kommun,
  medelInkomst2018:x.medelInkomst2018,
  medelInkomst2022: x.medelInkomst2022}));

//tableFromData({data:totaltIncome});


// get medelInkomst2018 
const income2018List = totaltIncome.map(x => parseFloat(x.medelInkomst2018));

//console.log('income2018List', income2018List)

drawGoogleChart({
  elementId: 'income_histogram_2018', 
  type: 'Histogram',
  data: makeChartFriendly(
    income2018List.map(x => ({ x })),
    'Medelinkomst2018'
  ),
  options: {
    height: 400,
    histogram: { bucketSize: 10 },
    legend: { position: 'none' },
    hAxis: {
    slantedText: true, 
    slantedTextAngle: 45
    //ticks: [220, 240, 260, 280]
    },
    title: `Medelinkomst2018`
  
  }
});

// get medelInkomst2022
const income2022List = totaltIncome.map(x => parseFloat(x.medelInkomst2022));

//console.log('income2018List', income2018List)

drawGoogleChart({
  elementId: 'income_histogram_2022', 
  type: 'Histogram',
  data: makeChartFriendly(
    income2018List.map(x => ({ x })),
    'Medelinkomst2022'
  ),
  options: {
    height: 400,
    histogram: { bucketSize: 10 },
    legend: { position: 'none' },
    hAxis: {
    slantedText: true, 
    slantedTextAngle: 45
    //ticks: [220, 240, 260, 280]
    },
  title: `Medelinkomst2022`
  
  }
});

//console.log('income2018List',income2018List);

const result = stdLib.stats.shapiroWilkTest(income2018List);

//console.log('Shapiro-Wilk P-value:', result.p.toExponential(6));


addMdToPage(`
### 📐 Shapiro-Wilk normalitetstest för kommun inkomst

- **p-värde**: ${result.p.toExponential(6)}
- ${result.p < 0.05
    ? "❌ Inkomst verkar inte vara normalfördelad."
    : "✅ Inkomst verkar vara normalfördelad"}
`);



let top5Year2018 = totaltIncome
  .map(x=>({kommun:x.kommun,medelInkomst2018:x.medelInkomst2018}))
  .sort((a, b) => b.medelInkomst2018 - a.medelInkomst2018)
  .slice(0, 5);

console.log("Top 5 kommuner by income 2018:");
top5Year2018.forEach(item => {
  console.log(`${item.kommun}: ${item.medelInkomst2018} TSEK`);
});

let top5Year2022 = totaltIncome
  .map(x=>({kommun:x.kommun,medelInkomst2022:x.medelInkomst2022}))
  .sort((a, b) => b.medelInkomst2022 - a.medelInkomst2022)
  .slice(0, 5);

console.log("Top 5 kommuner by income 2022:");
top5Year2022.forEach(item => {
  console.log(`${item.kommun}: ${item.medelInkomst2022} TSEK`);
});

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(top5Year2018, 'Kommun', 'MedelInkomst'),
  options: {
    height: 500,
    legend: { position: 'none' },
    vAxis: { 
      format: '#',
      minValue:400,
      maxValue:700,
      title:"TSEK"
     },
    chartArea: { left: 100, right: 200 },
    title: `Top 5 Medelinkomst Kommun 2018`
  }
});

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(top5Year2022, 'Kommun', 'MedelInkomst'),
  options: {
    height: 500,
    legend: { position: 'none' },
    vAxis: { 
      format: '#',
      minValue:400,
      maxValue:700,
      title:"TSEK"
     },
    chartArea: { left: 100, right: 200 },
    title: `Top 5 Medelinkomst Kommun 2022`
  }
});



const kommunList = [...new Set(income.map(x => x.kommun))].sort();
//console.log('kommunList', kommunList); 

const könList = [...new Set(income.map(x => x.kon))].sort();
//console.log('könList', könList,''); 

const years = [2018, 2019, 2020, 2021, 2022];

function buildDataArray(kommunData,gender) {
  const genderData = kommunData.find(x => x.kön === gender);
  return [
    ['År', 'MedelInkomst','MedianInkomst'],
    ...years.map(year => [
      year,
      genderData?.[`medelInkomst${year}`] || null,
      genderData?.[`medianInkomst${year}`] || null
    ])
  ];
}

let kommun1 = addDropdown('Kommun', kommunList, 'Stockholm');
let kön1 = addDropdown('Kön', könList, 'totalt');

let dataKommun1 = incomeDataForTable.filter(x => x.kommun == kommun1);
//console.log('incomeDataForKommun1',dataKommun1);

const selectedGenderDataKommun1  = buildDataArray(dataKommun1,kön1).slice(1);
//console.log('selectedGenderData',selectedGenderDataKommun1);

drawGoogleChart({
  elementId: 'income_line_chart1', 
  type: 'LineChart',
  data: makeChartFriendly(selectedGenderDataKommun1, 'År', 'MedelInkomst','MedianInkomst'),
  options: {
    height: 500,
    chartArea: { left: 100, right: 200 },
    curveType: 'function',
    pointSize: 5,
    pointShape: 'circle',
    vAxis: { 
      format: '#',
      minValue:250,
      maxValue:500,
      title:"TSEK"
     },
    hAxis: {
      ticks: [2018, 2019, 2020, 2021, 2022],
      format: '####'
    },
    title: `${kommun1} Kommun`
  }
});

let kommun2 = addDropdown('Kommun', kommunList, 'Malmö');
let kön2 = addDropdown('Kön', könList, 'totalt');

let dataKommun2 = incomeDataForTable.filter(x => x.kommun == kommun2);
//console.log('incomeDataForKommun2',dataKommu2);

const selectedGenderDataKommun2  = buildDataArray(dataKommun2,kön2).slice(1);
//console.log('selectedGenderDataKommun2',selectedGenderDataKommun2);

drawGoogleChart({
  elementId: 'income_line_chart2', 
  type: 'LineChart',
  data: makeChartFriendly(selectedGenderDataKommun2, 'År', 'MedelInkomst','MedianInkomst'),
  options: {
    height: 500,
    chartArea: { left: 100, right: 200 },
    curveType: 'function',
    pointSize: 5,
    pointShape: 'circle',
    vAxis: { 
      format: '#',
      minValue:250,
      maxValue:500,
      title:"TSEK"
     },
    hAxis: {
      ticks: years,
      format: '####'
    },
    title: `${kommun2} Kommun`
  }
}); 