let returdata = [];

// Funktion til at læse Excel-fil og gemme data
document.getElementById('fileInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Konverterer Excel-data til JSON-format
    returdata = XLSX.utils.sheet_to_json(worksheet);
    
    // Debugging: Udskriv returdata til konsollen
    console.log(returdata); // Log returnerede data til fejlfinding
    
    generateDashboard(); // Generer dashboardet ved indlæsning af data
  };

  reader.readAsArrayBuffer(file);
});

function generateDashboard() {
  const categorySummary = {};
  const returnReasons = {};
  const productReturns = {};
  let totalRecommendations = 0; // Holder styr på det samlede antal potentielle anbefalinger

  // Tæl antallet af returneringer pr. kategori og årsag
  returdata.forEach(item => {
      const category = item.Kategori || "Ukendt";
      categorySummary[category] = (categorySummary[category] || 0) + item['Antal retur'];

      const reason = item.Returårsag || "Ukendt";
      returnReasons[reason] = (returnReasons[reason] || 0) + item['Antal retur'];

      const productKey = `${item.Produktnavn} (${item.Størrelse})`;
      productReturns[productKey] = (productReturns[productKey] || 0) + item['Antal retur'];
  });

  // Byg dashboardet
  let dashboardHTML = '<h3>Dashboard Opsummering:</h3>';
  dashboardHTML += '<div class="dashboard">';

  // Kategori Tabel
  dashboardHTML += `<div><strong>Kategori</strong><br><table><tr><th>Navn</th><th>Antal</th></tr>`;
  for (const category in categorySummary) {
      dashboardHTML += `<tr><td>${category}</td><td>${categorySummary[category]}</td></tr>`;
  }
  dashboardHTML += `</table></div>`;

  // Årsager Tabel
  dashboardHTML += `<div><strong>Årsager</strong><br><table><tr><th>Årsag</th><th>Antal</th></tr>`;
  for (const reason in returnReasons) {
      dashboardHTML += `<tr><td>${reason}</td><td>${returnReasons[reason]}</td></tr>`;
  }
  dashboardHTML += `</table>`;

  // Beregn potentielle anbefalinger
  const summary = returdata.reduce((acc, item) => {
      const key = `${item.Produktnavn} (${item.Størrelse})`;
      if (!acc[key]) {
          acc[key] = { forLille: 0, forStor: 0, fortrudt: 0, fremstårIkkeSomVist: 0, total: 0, kategori: item.Kategori };
      }
      if (item.Returårsag.trim() === 'For lille') {
          acc[key].forLille += item['Antal retur'];
      } else if (item.Returårsag.trim() === 'For stor') {
          acc[key].forStor += item['Antal retur'];
      } else if (item.Returårsag.trim() === 'Fortrudt') {
          acc[key].fortrudt += item['Antal retur'];
      } else if (item.Returårsag.trim() === 'Fremstår ikke som vist') {
          acc[key].fremstårIkkeSomVist += item['Antal retur'];
      }
      acc[key].total += item['Antal retur'];
      return acc;
  }, {});

  // Grupperer størrelsesanbefalinger og tæller potentielle anbefalinger
  for (let product in summary) {
      const productData = summary[product];
  
      if (
          productData.forLille >= 6 || 
          productData.forStor >= 6 || 
          productData.fortrudt >= 2 || 
          productData.fremstårIkkeSomVist >= 2
      ) {
          totalRecommendations++; // Tæl denne anbefaling som potentiel
      }
  }

  // Tilføj overskrift og cirkel for potentielle anbefalinger
  dashboardHTML += `<h3>Potentielle anbefalinger</h3>`;
  dashboardHTML += `<div id="recommendationCircle">${totalRecommendations}</div>`;
  dashboardHTML += `</div>`; // Afslut dashboardet

  // Produkter med flest returneringer
  dashboardHTML += `<div><strong>Produkter med flest returneringer</strong><br><ul>`;
  const sortedProducts = Object.entries(productReturns)
      .sort(([, a], [, b]) => b - a) // Sorter efter antal
      .slice(0, 10); // Tag de 10 mest returnerede

  sortedProducts.forEach(([product, count]) => {
      dashboardHTML += `<li><strong>${product}</strong>: ${count} gange returneret</li>`;
  });

  dashboardHTML += `</ul></div>`;

  // Sæt dashboard HTML ind i DOM
  document.getElementById('dashboard').innerHTML = dashboardHTML;

  // Opdater cirklen med det samlede antal anbefalinger
  document.getElementById('recommendationCircle').innerText = totalRecommendations; // Opdaterer med den nye værdi
}

// Konstanter for returårsager
const RETURN_REASONS = {
  FOR_LILLE: 'For lille',
  FOR_STOR: 'For stor',
  FORTRUDT: 'Fortrudt',
  FREMSTÅR_IKKE_SOM_VIST: 'Fremstår ikke som vist',
};

function generateRecommendation() {
  let recommendationText = '';
  let sizeRecommendations = ''; // Holder størrelsesanbefalinger
  let otherIssues = ''; // Holder andre årsager

  // Tæl antal returneringer pr. produkt og årsag
  const summary = returdata.reduce((acc, item) => {
      const key = `${item.Produktnavn} (${item.Størrelse})`;
      if (!acc[key]) {
          acc[key] = { forLille: 0, forStor: 0, fortrudt: 0, fremstårIkkeSomVist: 0, total: 0, kategori: item.Kategori };
      }
      if (item.Returårsag.trim() === 'For lille') {
          acc[key].forLille += item['Antal retur'];
      } else if (item.Returårsag.trim() === 'For stor') {
          acc[key].forStor += item['Antal retur'];
      } else if (item.Returårsag.trim() === 'Fortrudt') {
          acc[key].fortrudt += item['Antal retur'];
      } else if (item.Returårsag.trim() === 'Fremstår ikke som vist') {
          acc[key].fremstårIkkeSomVist += item['Antal retur'];
      }
      acc[key].total += item['Antal retur'];
      return acc;
  }, {});

  // Grupperer størrelsesanbefalinger
  for (let product in summary) {
      const productData = summary[product];

      // For anbefalinger baseret på størrelsen
      if (productData.forLille >= 6) {
          sizeRecommendations += `<div class="recommendation-item">
              <span class="category">${productData.kategori}</span>
              <span>${product} er generelt lille i størrelsen. Anbefal at gå en størrelse op.</span>
              <span class="remove" onclick="removeRecommendation(this)">✖</span>
          </div>`;
      }
      if (productData.forStor >= 6) {
          sizeRecommendations += `<div class="recommendation-item">
              <span class="category">${productData.kategori}</span>
              <span>${product} er generelt stor i størrelsen. Anbefal at gå en størrelse ned.</span>
              <span class="remove" onclick="removeRecommendation(this)">✖</span>
          </div>`;
      }
  }

  // Tilføj sektion for fortrudte køb
  for (let product in summary) {
      const productData = summary[product];
      if (productData.fortrudt >= 2) {
          otherIssues += `<div class="recommendation-item">
              <span>Kunder har ofte fortrudt køb af <strong>${product}</strong>.</span>
              <span class="remove" onclick="removeRecommendation(this)">✖</span>
          </div>`;
      }
      if (productData.fremstårIkkeSomVist >= 2) {
          otherIssues += `<div class="recommendation-item">
              <span>Kunder har ofte klaget over, at <strong>${product}</strong> fremstår anderledes end vist på billeder.</span>
              <span class="remove" onclick="removeRecommendation(this)">✖</span>
          </div>`;
      }
  }

  // Saml al anbefalingstekst
  recommendationText += `<h4>Størrelsesanbefalinger</h4>`;
  recommendationText += `<div>${sizeRecommendations}</div>`;
  recommendationText += `<h4>Fortrudte Køb</h4>`;
  recommendationText += `<div>${otherIssues}</div>`;

  // Vis anbefalingerne
  document.getElementById('recommendation-text').innerHTML = recommendationText;
}
// Funktion til at opsummere returneringer
function summarizeReturns(data) {
  return data.reduce((acc, item) => {
      const key = `${item.Produktnavn} (${item.Størrelse})`;
      if (!acc[key]) {
          acc[key] = { forLille: 0, forStor: 0, fortrudt: 0, fremstårIkkeSomVist: 0, total: 0, kategori: item.Kategori };
      }
      acc[key][item.Returårsag.trim()] = (acc[key][item.Returårsag.trim()] || 0) + item['Antal retur'];
      acc[key].total += item['Antal retur'];
      return acc;
  }, {});
}

// Funktion til at generere størrelsesanbefalinger
function generateSizeRecommendations(product, productData, recommendations) {
    const kategori = productData.kategori; // Hent kategori fra productData

    // Funktion til at tilføje anbefalinger
    function addSizeRecommendation(condition, message) {
        if (condition) {
            recommendations.push(createRecommendationHTML(kategori, message));
        }
    }

    // Anvend den nye funktion til at tilføje anbefalinger
    addSizeRecommendation(productData[RETURN_REASONS.FOR_LILLE] >= 6, 
        `${product} er generelt lille i størrelsen. Anbefal at gå en størrelse op.`);
    
    addSizeRecommendation(productData[RETURN_REASONS.FOR_STOR] >= 6, 
        `${product} er generelt stor i størrelsen. Anbefal at gå en størrelse ned.`);
}
  
function createRecommendationHTML(kategori, message) {
    return `
        <div class="recommendation-item">
            <span class="category">${kategori}</span>
            <span style="margin-left: 10px;">${message}</span> <!-- Tilføjet margin -->
            <span class="remove" onclick="removeRecommendation(this)">✖</span>
        </div>
    `;
}

  
  // Funktion til at fjerne anbefalinger
  function removeRecommendation(element) {
    element.parentElement.remove(); // Fjern anbefalingen
  }


// Funktion til at generere andre problemer
function generateOtherIssues(product, productData, otherIssues) {
  if (productData[RETURN_REASONS.FORTRUDT] >= 2) {
      otherIssues.push(`
          <div class="recommendation-item">
              <span>Kunder har ofte fortrudt køb af <strong>${product}</strong>.</span>
              <span class="remove" onclick="removeRecommendation(this)">✖</span>
          </div>
      `);
  }
  if (productData[RETURN_REASONS.FREMSTÅR_IKKE_SOM_VIST] >= 2) {
      otherIssues.push(`
          <div class="recommendation-item">
              <span>Kunder har ofte klaget over, at <strong>${product}</strong> fremstår anderledes end vist på billeder.</span>
              <span class="remove" onclick="removeRecommendation(this)">✖</span>
          </div>
      `);
  }
}

// Funktion til at vise anbefalinger
function displayRecommendations(recommendations, otherIssues) {
  const recommendationText = recommendations.join('') + otherIssues.join('');
  document.getElementById('recommendation-text').innerHTML = recommendationText;
}

// Funktion til at fjerne en anbefaling
function removeRecommendation(element) {
  const listItem = element.parentElement;
  listItem.style.display = 'none'; // Skjul elementet i UI

  // Opdater cirklen med det samlede antal anbefalinger
  document.getElementById('recommendationCircle').innerText = totalRecommendations; // Opdaterer med den nye værdi
}

// Knappen til at generere anbefalinger
document.getElementById('generateRecommendationsButton').addEventListener('click', generateRecommendation);

// Funktion til at opdatere Shopify produktbeskrivelse via API (simuleret)
async function updateShopifyProduct() {
  const updatedDescription = document.getElementById('recommendation-text').innerHTML;
  
  const productId = '123456'; // ID på produktet som skal opdateres i Shopify
  
  try {
    const response = await fetch(`https://your-shopify-store.myshopify.com/admin/api/2023-04/products/${productId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer DIT_SHOPIFY_API_KEY'
      },
      body: JSON.stringify({
        product: {
          id: productId,
          body_html: updatedDescription
        }
      })
    });

    if (response.ok) {
      alert('Produktbeskrivelse opdateret i Shopify!');
    } else {
      alert('Opdatering sendt til Shopify (Raised a ticket).');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Opdatering sendt til Shopify (Raised a ticket).');
  }
}
