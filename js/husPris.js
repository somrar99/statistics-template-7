

addMdToPage(`
  ### Länsinfo, från SQlite
  Info om HusPriser per kommun i tussen kronor
  `);
dbQuery.use('HusPris-sqlite');
let meddelHusPris = await dbQuery('SELECT SUBSTR(Region, 6) AS Kommun,  "2018",  "2022" FROM HusPrisITusenKr; ');
//tableFromData({ data: meddelHusPris });



dbQuery.use('kommun-info-mongodb');
let income = await dbQuery.collection('incomeByKommun').find({});

// Фильтруем и трансформируем данные
let cleanedIncome = income.map(doc => ({
  kommun: doc.kommun,
  medelInkomst2018: doc.medelInkomst2018,
  medelInkomst2022: doc.medelInkomst2022
}));

//console.table(cleanedIncome.slice(0, 5));

// Преобразуем доход в словарь по названию коммуны
let incomeMap = {};
cleanedIncome.forEach(doc => {
  incomeMap[doc.kommun] = {
    medel2018: doc.medelInkomst2018,
    medel2022: doc.medelInkomst2022
  };
});

// Соединяем с ценами и делим
let priceToIncome = meddelHusPris.map(row => {
  let kommun = row.Kommun;
  let income = incomeMap[kommun];

  let kvot2018 = row["2018"] / income.medel2018;
  let kvot2022 = row["2022"] / income.medel2022;
  let tillväxtInkomst = ((income.medel2022 - income.medel2018) / income.medel2018) * 100;
  let tillväxtKvot = ((kvot2022 - kvot2018) / kvot2018) * 100;

  return {
    kommun,
    tillväxtInkomst: tillväxtInkomst.toFixed(1) + '%',
    kvot2018: kvot2018.toFixed(2),
    kvot2022: kvot2022.toFixed(2),
    tillväxtKvot: tillväxtKvot.toFixed(1) + '%'
  };
});

tableFromData({ data: priceToIncome });



let finalTable = priceToIncome.map(row => {
  let match = sammanstallning.find(s => s.kommun === row.kommun);

  return {
    ...row,
    vinnare2018: match ? match.vinnare2018 : null,
    vinnare2022: match ? match.vinnare2022 : null,
    byte: match ? match.byte : null
  };
});
//export default sammanstallning;
console.table(finalTable);



