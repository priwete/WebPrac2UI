import { UIComponent } from './UIComponent.js';

/**
 * PlayerCountWidget — «Игроков онлайн».
 *
 * Официальный Steam Web API (ISteamUserStats/GetNumberOfCurrentPlayers)
 * не отдаёт заголовки CORS и не может быть вызван напрямую из браузера
 * без собственного сервера-прокси. Вместо этого используется публичное
 * SteamSpy API (ключ не нужен, CORS открыт) — оно даёт агрегированную,
 * не поминутную оценку активности игры. Ограничение явно указано
 * пользователю в самом виджете и в README.
 */
export class PlayerCountWidget extends UIComponent {
  static CS2_APP_ID = 730;

  constructor(config) {
    super({ ...config, title: config.title ?? 'Игроков онлайн (API: SteamSpy)' });
  }

  renderBody() {
    const wrap = document.createElement('div');
    wrap.className = 'players';

    const status = document.createElement('p');
    status.className = 'widget__status';

    const value = document.createElement('p');
    value.className = 'players__value';
    value.hidden = true;

    const note = document.createElement('p');
    note.className = 'widget__note';
    note.textContent = 'Оценка активности CS2 по данным SteamSpy, не поминутная статистика.';
    note.hidden = true;

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn btn--ghost';
    refreshBtn.textContent = 'Обновить';

    wrap.append(status, value, note, refreshBtn);
    this._elements = { status, value, note, refreshBtn };

    refreshBtn.addEventListener('click', () => this.#load(), { signal: this.signal });

    return wrap;
  }

  onMount() {
    this.#load();
  }

  async #load() {
    const { status, value, note, refreshBtn } = this._elements;

    this._fetchController?.abort();
    this._fetchController = new AbortController();

    refreshBtn.disabled = true;
    status.hidden = false;
    status.textContent = 'Загрузка…';
    status.className = 'widget__status widget__status--loading';
    value.hidden = true;
    note.hidden = true;

    try {
      const target = `https://steamspy.com/api.php?request=appdetails&appid=${PlayerCountWidget.CS2_APP_ID}`;
      const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const ccu = data?.ccu;

      if (typeof ccu !== 'number' || ccu <= 0) {
        status.hidden = false;
        status.textContent = 'Данные об онлайне пока недоступны.';
        status.className = 'widget__status widget__status--empty';
        return;
      }

      value.textContent = ccu.toLocaleString('ru-RU');
      value.hidden = false;
      note.hidden = false;
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
