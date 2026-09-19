let idCounter = 0;

/**
 * Dashboard — управляет коллекцией активных виджетов и их отрисовкой
 * в сетке. Не знает ничего о конкретных классах виджетов напрямую —
 * получает "реестр" (widgetType -> класс) в конструкторе, поэтому
 * добавление нового типа виджета (см. QuoteWidget/PriceWidget/
 * PlayerCountWidget) не требует изменения кода самого Dashboard —
 * это и есть принцип открытости/закрытости (OCP) и полиморфизм:
 * Dashboard одинаково вызывает render()/destroy() у любого виджета.
 */
export class Dashboard {
  /** @type {Map<string, {new(config: object): import('./UIComponent.js').UIComponent}>} */
  #registry;
  /** @type {Map<string, import('./UIComponent.js').UIComponent>} */
  #widgets = new Map();
  #root;

  constructor(root, registry) {
    this.#root = root;
    this.#registry = new Map(Object.entries(registry));

    // Единая точка обработки клика "закрыть" для ЛЮБОГО виджета —
    // делегирование на уровне контейнера дашборда вместо навешивания
    // отдельного слушателя на кнопку каждого виджета.
    this.#root.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="close"]');
      if (!btn) return;
      const widgetEl = event.target.closest('[data-widget-id]');
      if (!widgetEl) return;
      this.removeWidget(widgetEl.dataset.widgetId);
    });
  }

  /**
   * Создаёт и монтирует виджет указанного типа.
   * @param {string} widgetType - ключ из реестра ('todo' | 'quote' | 'price' | 'players')
   * @param {object} [config] - дополнительные опции (например, свой title)
   * @returns {string} id созданного виджета
   */
  addWidget(widgetType, config = {}) {
    const WidgetClass = this.#registry.get(widgetType);
    if (!WidgetClass) {
      throw new Error(`Неизвестный тип виджета: "${widgetType}"`);
    }

    idCounter += 1;
    const id = `${widgetType}-${idCounter}`;
    const widget = new WidgetClass({ id, ...config });

    this.#widgets.set(id, widget);
    this.#root.appendChild(widget.render());
    this.#toggleEmptyState();

    return id;
  }

  /**
   * Удаляет виджет по id: вызывает его destroy() (снимает обработчики,
   * останавливает таймеры/запросы, убирает узел из DOM) и вычищает
   * его из внутренней коллекции.
   */
  removeWidget(widgetId) {
    const widget = this.#widgets.get(widgetId);
    if (!widget) return;
    widget.destroy();
    this.#widgets.delete(widgetId);
    this.#toggleEmptyState();
  }

  /** Удаляет все виджеты (например, при полной перезагрузке панели). */
  clear() {
    for (const id of [...this.#widgets.keys()]) this.removeWidget(id);
  }

  get size() {
    return this.#widgets.size;
  }

  #toggleEmptyState() {
    this.#root.classList.toggle('widget-grid--empty', this.#widgets.size === 0);
  }
}
