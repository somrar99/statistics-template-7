addMdToPage(`
  ### Länsinfo, från SQlite
  Info om HusPriser per kommun i tussen kronor
  `);
dbQuery.use('HusPris-sqlite');
let meddelHusPris = await dbQuery('SELECT SUBSTR(Region, 6) AS Kommun,  "2018",  "2022"FROM HusPrisITusenKr; ');
tableFromData({ data: meddelHusPris });
