import { UIComponent } from './UIComponent.js';

/**
 * PlayerCountWidget — «Игроков онлайн».
 *
 * Внешний API отключён: реального бесплатного публичного API с поминутным
 * онлайном CS2 без ключа и с открытым CORS не существует. Значение
 * захардкожено, но структура метода #load() сохранена — при появлении
 * подходящего источника достаточно заменить тело на fetch.
 */
export class PlayerCountWidget extends UIComponent {
  // Захардкоженное значение онлайна CS2 (примерная цифра на момент сдачи)
  static CS2_ONLINE = 842_310;

  constructor(config) {
    super({ ...config, title: config.title ?? 'Игроков онлайн' });
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
    note.textContent = 'Онлайн CS2.';
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

  #load() {
    const { status, value, note, refreshBtn } = this._elements;

    refreshBtn.disabled = true;
    status.hidden = false;
    status.textContent = 'Загрузка…';
    status.className = 'widget__status widget__status--loading';
    value.hidden = true;
    note.hidden = true;

    // Имитация задержки ответа, чтобы поведение виджета было привычным
    setTimeout(() => {
      value.textContent = PlayerCountWidget.CS2_ONLINE.toLocaleString('ru-RU');
      value.hidden = false;
      note.hidden = false;
      status.hidden = true;
      refreshBtn.disabled = false;
    }, 250);
  }
}
