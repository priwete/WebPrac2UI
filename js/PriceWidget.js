import { UIComponent } from './UIComponent.js';

const REFRESH_MS = 60_000;

/**
 * PriceWidget — «Актуальный курс» (для пересчёта цен сделок).
 *
 * Реальных бесплатных API с ценами скинов CS2 без ключа и с открытым
 * CORS не существует, поэтому в качестве живого источника используется
 * публичное API CoinGecko (курс BTC/USD, ключ не нужен) — по смыслу
 * это тот же тип виджета, что показан в макете («Актуальная цена»),
 * просто с реально доступным источником данных. См. README.
 *
 * Обновляется автоматически раз в минуту; интервал и запрос корректно
 * останавливаются в destroy().
 */
export class PriceWidget extends UIComponent {
  constructor(config) {
    super({ ...config, title: config.title ?? 'Актуальный курс (API: CoinGecko)' });
  }

  renderBody() {
    const wrap = document.createElement('div');
    wrap.className = 'price';

    const status = document.createElement('p');
    status.className = 'widget__status';

    const main = document.createElement('div');
    main.className = 'price__main';
    main.hidden = true;

    const label = document.createElement('span');
    label.className = 'price__label';
    label.textContent = 'BTC / USD';

    const value = document.createElement('span');
    value.className = 'price__value';

    const change = document.createElement('span');
    change.className = 'price__change';

    main.append(label, value, change);

    const svgNS = 'http://www.w3.org/2000/svg';
    const chart = document.createElementNS(svgNS, 'svg');
    chart.classList.add('price__chart');
    chart.setAttribute('viewBox', '0 0 300 80');
    chart.setAttribute('preserveAspectRatio', 'none');
    chart.setAttribute('aria-hidden', 'true');
    chart.hidden = true;

    const path = document.createElementNS(svgNS, 'polyline');
    path.setAttribute('class', 'price__chart-line');
    chart.appendChild(path);

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn btn--ghost';
    refreshBtn.textContent = 'Обновить сейчас';

    wrap.append(status, main, chart, refreshBtn);

    this._elements = { status, main, value, change, chart, path, refreshBtn };

    refreshBtn.addEventListener('click', () => this.#load(), { signal: this.signal });

    return wrap;
  }

  onMount() {
    this.#load();
    const intervalId = setInterval(() => this.#load(), REFRESH_MS);
    this._registerTimer(intervalId);
  }

  async #load() {
    const { status, main, value, change, chart, path, refreshBtn } = this._elements;

    this._fetchController?.abort();
    this._fetchController = new AbortController();

    refreshBtn.disabled = true;
    status.hidden = false;
    status.textContent = 'Загрузка курса…';
    status.className = 'widget__status widget__status--loading';

    try {
      const [priceRes, chartRes] = await Promise.all([
        fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
          { signal: this._fetchController.signal }
        ),
        fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1', {
          signal: this._fetchController.signal,
        }),
      ]);

      if (!priceRes.ok || !chartRes.ok) {
        throw new Error(`HTTP ${priceRes.status}/${chartRes.status}`);
      }

      const priceData = await priceRes.json();
      const chartData = await chartRes.json();

      const usd = priceData?.bitcoin?.usd;
      const changePct = priceData?.bitcoin?.usd_24h_change;
      const series = chartData?.prices;

      if (typeof usd !== 'number' || !Array.isArray(series) || series.length === 0) {
        status.hidden = false;
        status.textContent = 'Данные пока недоступны.';
        status.className = 'widget__status widget__status--empty';
        main.hidden = true;
        chart.hidden = true;
        return;
      }

      value.textContent = `$${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
      const changeText = `${changePct >= 0 ? '▲' : '▼'} ${Math.abs(changePct).toFixed(2)}% за 24ч`;
      change.textContent = changeText;
      change.classList.toggle('price__change--up', changePct >= 0);
      change.classList.toggle('price__change--down', changePct < 0);

      this.#drawSparkline(path, series.map(([, p]) => p));

      status.hidden = true;
      main.hidden = false;
      chart.hidden = false;
    } catch (error) {
      if (error.name === 'AbortError') return;
      status.hidden = false;
      status.textContent = 'Не удалось получить курс. Попробуйте ещё раз позже.';
      status.className = 'widget__status widget__status--error';
      main.hidden = true;
      chart.hidden = true;
    } finally {
      refreshBtn.disabled = false;
    }
  }

  #drawSparkline(path, prices) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const stepX = 300 / (prices.length - 1 || 1);

    const points = prices
      .map((p, i) => {
        const x = (i * stepX).toFixed(1);
        const y = (78 - ((p - min) / span) * 76).toFixed(1);
        return `${x},${y}`;
      })
      .join(' ');

    path.setAttribute('points', points);
  }

  onDestroy() {
    this._fetchController?.abort();
  }
}
