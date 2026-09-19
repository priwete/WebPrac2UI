import { UIComponent } from './UIComponent.js';

/**
 * QuoteWidget — «Совет дня». Данные приходят со стороннего API
 * (https://api.adviceslip.com), ключ не требуется.
 *
 * Показывает 4 состояния: загрузка / пусто / ошибка / успех.
 * Устаревший запрос (если пользователь быстро жмёт «Обновить»
 * несколько раз подряд) отменяется через AbortController.
 */
export class QuoteWidget extends UIComponent {
  #currentText = '';

  constructor(config) {
    super({ ...config, title: config.title ?? 'Совет дня' });
  }

  renderBody() {
    const wrap = document.createElement('div');
    wrap.className = 'quote';

    const status = document.createElement('p');
    status.className = 'widget__status';
    status.hidden = true;

    const text = document.createElement('blockquote');
    text.className = 'quote__text';
    text.hidden = true;

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn btn--accent';
    refreshBtn.textContent = 'Обновить';

    const source = document.createElement('p');
    source.className = 'widget__source';
    source.textContent = 'Источник: api.adviceslip.com';

    wrap.append(status, text, refreshBtn, source);

    this._elements = { status, text, refreshBtn };

    refreshBtn.addEventListener('click', () => this.#loadAdvice(), { signal: this.signal });

    return wrap;
  }

  onMount() {
    this.#loadAdvice();
  }

  async #loadAdvice() {
    const { status, text, refreshBtn } = this._elements;

    // Отменяем предыдущий незавершённый запрос этого же виджета,
    // если пользователь нажал «Обновить» ещё раз.
    this._fetchController?.abort();
    this._fetchController = new AbortController();

    refreshBtn.disabled = true;
    text.hidden = true;
    status.hidden = false;
    status.textContent = 'Загрузка совета…';
    status.className = 'widget__status widget__status--loading';

    try {
      // cache-buster: у adviceslip.com агрессивный CDN-кэш
      const url = `https://api.adviceslip.com/advice?t=${Date.now()}`;
      const response = await fetch(url, { signal: this._fetchController.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const advice = data?.slip?.advice?.trim();

      if (!advice) {
        status.hidden = false;
        status.textContent = 'Совет не найден. Попробуйте обновить ещё раз.';
        status.className = 'widget__status widget__status--empty';
        text.hidden = true;
        this.#currentText = '';
        return;
      }

      this.#currentText = advice;
      text.textContent = advice; // textContent — данные API не доверенные
      text.hidden = false;
      status.hidden = true;
    } catch (error) {
      if (error.name === 'AbortError') return; // запрос отменён — это не ошибка для UI
      status.hidden = false;
      status.textContent = 'Не удалось загрузить совет. Проверьте связь и попробуйте снова.';
      status.className = 'widget__status widget__status--error';
      text.hidden = true;
    } finally {
      refreshBtn.disabled = false;
    }
  }

  onDestroy() {
    this._fetchController?.abort();
  }
}
