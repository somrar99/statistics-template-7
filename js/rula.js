(async () => {
  // 📌 Introduktion
  addMdToPage(`
  ## Hur har stödet förändrats mellan 2018 och 2022?

  Vi undersöker hur stödet för **Moderaterna (M)** och **Socialdemokraterna (S)** har förändrats i fem kommuner mellan riksdagsvalen 2018 och 2022.
  `);

  // 🎯 Frågeställning & Metod
  addMdToPage(`
  ## Frågeställning

  Hur har partistödet för M och S förändrats i kommuner med olika medelålder mellan 2018 och 2022?

  ---
  ## Metod

  Vi har använt data från **Valmyndigheten** (valresultat) och **SCB** (medelålder per kommun).  
  Fem kommuner valdes: **Uppsala**, **Lidingö**, **Sigtuna**, **Täby** och **Botkyrka**.  
  För varje kommun visas partistödet för M och S i både 2018 och 2022 i ett kolumndiagram.
  `);

  // 📊 Ladda och bearbeta data
  const valresultat = await jload("valresultat.json");
  const kommuner = ["Uppsala", "Lidingö", "Sigtuna", "Täby", "Botkyrka"];

  const medelåldrar = {
    Uppsala: 39.1,
    Lidingö: 42.2,
    Sigtuna: 38.3,
    Täby: 41.3,
    Botkyrka: 37.5,
  };

  const diagramData = [["Kommun", "M 2018", "M 2022", "S 2018", "S 2022"]];
  kommuner.forEach((kommun) => {
    const k = valresultat.find((k) => k.kommun === kommun);
    if (k) {
      diagramData.push([
        kommun,
        k.val2018.M,
        k.val2022.M,
        k.val2018.S,
        k.val2022.S,
      ]);
    }
  });

  // 📊 Rita diagrammet
  google.charts.load("current", { packages: ["corechart"] });
  google.charts.setOnLoadCallback(() => {
    const chart = new google.visualization.ComboChart(document.body);
    const data = google.visualization.arrayToDataTable(diagramData);
    chart.draw(data, {
      title: "Förändring i partistöd 2018 vs 2022",
      hAxis: { title: "Kommun", slantedText: true },
      vAxis: { title: "Stöd (%)" },
      legend: { position: "top" },
      seriesType: "bars",
      colors: ["#3366cc", "#1a73e8", "#d93025", "#ea4335"],
    });
  });

  // 📈 Tolkning
  addMdToPage(`
  ## Tolkning

  - **Moderaterna (M)** har ökat i kommuner som **Lidingö**, **Täby** och **Uppsala**.
  - **Socialdemokraterna (S)** har minskat något i dessa kommuner men behåller starkt stöd i **Sigtuna** och **Botkyrka**.
  - Det tyder på att kommuner med högre medelålder röstar mer borgerligt.

  ---
  ## Slutsats

  Det verkar finnas ett samband mellan **medelålder** i en kommun och hur väljarstödet förändras över tid.  
  För att dra statistiskt säkra slutsatser rekommenderas vidare analys, t.ex. med **T-test** eller **regressionsanalys**.
  `);

  // 🔗 Koppling till annan analys
  addMdToPage(`
  ## Samband med medelålder

  När vi tittar på resultaten i dessa kommuner ser vi att **kommuner med hög medelålder**, som *Lidingö* och *Täby*, inte bara har **högre stöd för Moderaterna**, utan också har sett en **ökning i stödet för M mellan 2018 och 2022**.

  I kontrast har **kommuner med lägre medelålder**, som *Sigtuna* och *Botkyrka*, behållit ett starkt stöd för **Socialdemokraterna (S)**.

  Detta stödjer tidigare analys från sidan *Medelålder och partistöd*, där vi såg en **korrelation mellan högre medelålder och borgerligt röstande**.
  `);

  // 🔘 Länk till annan sida
  addHtmlToPage(`
    <button onclick="location.href='#rula-test'" style="margin-top: 1em; padding: 10px 20px; font-size: 1rem; background-color: #1a73e8; color: white; border: none; border-radius: 5px; cursor: pointer;">
      👉 Läs mer på sidan T-test Rula
    </button>
  `);

  // 📋 Medelålderstabell
  addMdToPage(`
  ## Medelålder i kommunerna (2022)

  <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #ddd; padding: 8px;">Kommun</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Medelålder</th>
      </tr>
    </thead>
    <tbody>
      ${kommuner
        .map(
          (k, i) => `
        <tr style="${i % 2 === 0 ? "" : "background-color: #fafafa;"}">
          <td style="border: 1px solid #ddd; padding: 8px;">${k}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            medelåldrar[k]
          } år</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
  `);

  // 🧩 Dropdown för att visa detaljer för vald kommun
  addHtmlToPage(`
    <h2 style="margin-top: 2em;">🔍 Välj kommun för detaljer</h2>
    <select id="kommunDropdown" style="padding: 8px; font-size: 1rem;">
      <option disabled selected>Välj kommun</option>
      ${kommuner.map((k) => `<option value="${k}">${k}</option>`).join("")}
    </select>
    <div id="kommunInfo" style="margin-top: 1em; font-size: 1.1rem;"></div>
  `);

  document
    .getElementById("kommunDropdown")
    .addEventListener("change", function () {
      const selected = this.value;
      const info = valresultat.find((k) => k.kommun === selected);
      const alder = medelåldrar[selected];

      if (info) {
        document.getElementById("kommunInfo").innerHTML = `
        <strong>${selected}</strong><br/>
        🧓 Medelålder: <b>${alder}</b> år<br/>
        🟦 Moderaterna:<br/>
        &nbsp;&nbsp;• 2018: <b>${info.val2018.M}%</b><br/>
        &nbsp;&nbsp;• 2022: <b>${info.val2022.M}%</b><br/>
        🟥 Socialdemokraterna:<br/>
        &nbsp;&nbsp;• 2018: <b>${info.val2018.S}%</b><br/>
        &nbsp;&nbsp;• 2022: <b>${info.val2022.S}%</b><br/>
        <br/>
        <em>${
          alder > 40
            ? "Denna kommun har hög medelålder – stöd för M är ofta starkare."
            : "Denna kommun har lägre medelålder – stöd för S är ofta högre."
        }</em>
      `;
      }
    });
})();
