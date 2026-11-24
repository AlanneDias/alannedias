(() => {
  // Series 1 is Banco Central do Brasil's daily USD selling rate in BRL.
  const endpoint = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json';
  const internationalMultiplier = 1.40;
  const cacheKey = 'alanne-usd-bcb-v1';
  const day = 24 * 60 * 60 * 1000;
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'code' });
  const brl = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL', currencyDisplay: 'code' });
  const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
  let rate = null;

  function validRate(quote) {
    const now = Date.now();
    return quote &&
      Number.isFinite(quote.value) && quote.value > 0 &&
      Number.isFinite(quote.date) && quote.date <= now &&
      now - quote.date <= 7 * day;
  }

  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey));
    if (validRate(cached)) rate = cached;
  } catch {}

  window.StudioFx = {
    format(amountInBrl) {
      return rate ? usd.format(amountInBrl * internationalMultiplier / rate.value) : brl.format(amountInBrl);
    },
    note() {
      return rate
        ? `USD estimates use Banco Central do Brasil’s rate from ${dateFormat.format(rate.date)}. The final quote is confirmed when you contact the studio.`
        : 'USD conversion is unavailable. Original prices are shown in BRL; request a USD quote from the studio.';
    },
  };

  async function refreshRate() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(endpoint, { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) return;
      const [latest] = await response.json();
      const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(latest?.data);
      if (!parts) return;

      const [, dd, mm, yyyy] = parts;
      const quote = { value: Number(latest.valor), date: Date.parse(`${yyyy}-${mm}-${dd}T00:00:00Z`), fetchedAt: Date.now() };
      if (!validRate(quote) || (rate && quote.date < rate.date)) return;
      rate = quote;
      try { sessionStorage.setItem(cacheKey, JSON.stringify(quote)); } catch {}
      window.dispatchEvent(new Event('studio:fx-ready'));
    } catch {
      // Keep the recent cached quote or display the original currency.
    } finally {
      clearTimeout(timeout);
    }
  }

  function updateMarkedPrices() {
    document.querySelectorAll('[data-studio-brl]').forEach(element => {
      const amount = Number(element.dataset.studioBrl);
      if (Number.isFinite(amount)) element.textContent = window.StudioFx.format(amount);
    });
    document.querySelectorAll('[data-studio-fx-note]').forEach(element => {
      element.textContent = window.StudioFx.note();
    });
  }

  window.addEventListener('studio:fx-ready', updateMarkedPrices);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateMarkedPrices, { once: true });
  } else {
    updateMarkedPrices();
  }

  const cacheIsFresh = rate && Date.now() - rate.fetchedAt < 4 * 60 * 60 * 1000;
  if (!cacheIsFresh) refreshRate();
})();
