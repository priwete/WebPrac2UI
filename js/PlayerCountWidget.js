import { UIComponent } from './UIComponent.js';

const CS2_APP_ID = 730;

/**
 * PlayerCountWidget — «Игроков онлайн».
 *
 * Источник: Steam Web API ISteamUserStats/GetNumberOfCurrentPlayers —
 * публичный эндпоинт, ключ не нужен. Steam не отдаёт CORS-заголовки,
 * поэтому запрос идёт через CORS-прокси allorigins.win (тот же приём,
 * что уже используется в остальных виджетах проекта).
 */
export class PlayerCountWidget extends UIComponent {
  constructor(config) {
    super({ ...config, title: config.title ?? 'Игроков онлайн (CS2)' });
  }

  renderBody() {
    const wrap = document.createElement('div');
    wrap.className = 'players';

    const status = document.createElement('p');
    status.className = 'widget__status';

    const value = document.createElement('p');
    value.className = 'players__value';
    value.hidden = true;

    const updated = document.createElement('p');
    updated.className = 'widget__note';
    updated.hidden = true;

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn btn--ghost';
    refreshBtn.textContent = 'Обновить';

    wrap.append(status, value, updated, refreshBtn);
    this._elements = { status, value, updated, refreshBtn };

    refreshBtn.addEventListener('click', () => this.#load(), { signal: this.signal });
    return wrap;
  }

  onMount() {
    this.#load();
  }

  async #load() {
    const { status, value, updated, refreshBtn } = this._elements;

    this._fetchController?.abort();
    this._fetchController = new AbortController();

    refreshBtn.disabled = true;
    status.hidden = false;
    status.textContent = 'Загрузка…';
    status.className = 'widget__status widget__status--loading';
    value.hidden = true;
    updated.hidden = true;

    try {
      const target =
        `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${CS2_APP_ID}`;
      const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;

      const response = await fetch(url, { signal: this._fetchController.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const count = data?.response?.player_count;

      if (typeof count !== 'number' || count <= 0) {
        status.hidden = false;
        status.textContent = 'Данные об онлайне пока недоступны.';
        status.className = 'widget__status widget__status--empty';
        return;
      }

      value.textContent = count.toLocaleString('ru-RU');
      value.hidden = false;

      updated.textContent = `Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;
      updated.hidden = false;

      status.hidden = true;
    } catch (error) {
      if (error.name === 'AbortError') return;
      status.hidden = false;
      status.textContent = 'Не удалось получить данные об онлайне.';
      status.className = 'widget__status widget__status--error';
    } finally {
      refreshBtn.disabled = false;
    }
  }

  onDestroy() {
    this._fetchController?.abort();
  }
}
