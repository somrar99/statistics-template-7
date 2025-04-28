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


const kommunList = [...new Set(income.map(x => x.kommun))].sort();
//console.log('kommunList', kommunList); 

const könList = [...new Set(income.map(x => x.kon))].sort();
console.log('könList', könList,''); 

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