addMdToPage("### medel- och medianInkomst per kommun - från 2018 till 2022");

dbQuery.use('kommun-info-mongodb');
let income = await dbQuery.collection('incomeByKommun').find({});
console.log('income from mongodb', income);

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

console.log('income for table', incomeDataForTable)

tableFromData({data:incomeDataForTable});