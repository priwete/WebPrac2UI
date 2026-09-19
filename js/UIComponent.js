/**
 * UIComponent — базовый (абстрактный) класс для всех виджетов панели.
 *
 * Наследники обязаны переопределить renderBody() и вернуть DOM-узел
 * с содержимым виджета. Всё, что общее для любого виджета (рамка,
 * заголовок, кнопки "свернуть"/"закрыть"), реализовано здесь один раз.
 *
 * Очистка ресурсов (обработчики событий, таймеры, незавершённые запросы)
 * привязана к единому AbortController: любой обработчик, повешенный
 * с опцией { signal: this.signal }, будет автоматически снят при
 * вызове destroy() -> controller.abort().
 */
export class UIComponent {
  constructor({ id, title }) {
    if (new.target === UIComponent) {
      throw new TypeError('UIComponent — абстрактный класс, создавайте только наследников');
    }
    if (!id || !title) {
      throw new TypeError('UIComponent требует id и title');
    }

    this.id = id;
    this.title = title;

    /** @protected общий контроллер для отмены fetch и снятия обработчиков */
    this._controller = new AbortController();
    /** @protected id таймеров/интервалов, которые нужно чистить в destroy() */
    this._timers = new Set();

    this._root = null;
    this._minimized = false;
  }

  /** @protected сигнал, который нужно передавать в fetch() и addEventListener() */
  get signal() {
    return this._controller.signal;
  }

  /**
   * Должен быть переопределён наследником.
   * @returns {HTMLElement} содержимое виджета (без внешней рамки)
   */
  renderBody() {
    throw new Error(`${this.constructor.name} должен реализовать renderBody()`);
  }

  /**
   * Вызывается сразу после того, как renderBody() вставлен в DOM.
   * Наследники могут переопределить, чтобы, например, сразу запустить
   * загрузку данных с API. По умолчанию ничего не делает.
   */
  onMount() {}

  /**
   * Хук для наследников: дополнительная очистка перед удалением
   * (например, отмена собственных подписок, не завязанных на signal).
   */
  onDestroy() {}

  /**
   * Собирает полный DOM-узел виджета: рамку + шапку + тело.
   * Используется классом Dashboard.
   * @returns {HTMLElement}
   */
  render() {
    const root = document.createElement('article');
    root.className = 'widget';
    root.dataset.widgetId = this.id;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', this.title);

    const header = document.createElement('header');
    header.className = 'widget__header';

    const heading = document.createElement('h3');
    heading.className = 'widget__title';
    heading.textContent = this.title;
    header.appendChild(heading);

    const controls = document.createElement('div');
    controls.className = 'widget__controls';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.type = 'button';
    minimizeBtn.className = 'widget__icon-btn';
    minimizeBtn.dataset.action = 'minimize';
    minimizeBtn.setAttribute('aria-label', 'Свернуть виджет');
    minimizeBtn.textContent = '–';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'widget__icon-btn';
    closeBtn.dataset.action = 'close';
    closeBtn.setAttribute('aria-label', 'Удалить виджет');
    closeBtn.textContent = '×';

    controls.append(minimizeBtn, closeBtn);
    header.appendChild(controls);

    const body = document.createElement('div');
    body.className = 'widget__body';
    body.appendChild(this.renderBody());

    root.append(header, body);
    this._root = root;
    this._body = body;

    // Общая логика minimize/close — делегирование внутри самого виджета.
    // Dashboard дополнительно слушает клик на data-action="close", чтобы
    // убрать виджет из своей коллекции и вызвать destroy().
    header.addEventListener(
      'click',
      (event) => {
        const btn = event.target.closest('button[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'minimize') this.minimize();
      },
      { signal: this.signal }
    );

    // Даём наследнику шанс что-то сделать сразу после монтирования
    // (например, запустить первую загрузку данных с API).
    queueMicrotask(() => this.onMount());

    return root;
  }

  /** Общий метод: свернуть/развернуть тело виджета */
  minimize() {
    if (!this._root) return;
    this._minimized = !this._minimized;
    this._root.classList.toggle('widget--minimized', this._minimized);
    const btn = this._root.querySelector('[data-action="minimize"]');
    if (btn) {
      btn.textContent = this._minimized ? '+' : '–';
      btn.setAttribute('aria-label', this._minimized ? 'Развернуть виджет' : 'Свернуть виджет');
    }
  }

  /**
   * Регистрирует таймер/интервал, который будет автоматически очищен
   * в destroy(). Возвращает исходный id таймера.
   */
  _registerTimer(timerId) {
    this._timers.add(timerId);
    return timerId;
  }

  /**
   * Корректно удаляет виджет из DOM и освобождает все ресурсы:
   * снимает обработчики событий (через abort сигнала), останавливает
   * таймеры и отменяет незавершённые сетевые запросы.
   */
  destroy() {
    this._controller.abort();
    for (const timerId of this._timers) {
      clearTimeout(timerId);
      clearInterval(timerId);
    }
    this._timers.clear();

    this.onDestroy();

    if (this._root && this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
    this._root = null;
    this._body = null;
  }
}
