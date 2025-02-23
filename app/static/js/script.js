const ctx = document.getElementById('chart').getContext('2d');
let chart;
let isDragging = false;
let startX, startY;
let minTime, maxTime;
let currentPrice = 0;

const startDate = new Date("2010-01-01");
const endDate = new Date();
let selectedCurrency = 'BTC';

let scatterData = []; // Масив для даних Scatter
const ohlcData = { labels: [], data: [] };

async function loadChartData() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('chart').style.display = 'none';
        document.getElementById('additional-info').style.display = 'none';

        let currentStartDate = Math.floor(startDate.getTime() / 1000);
        let currentEndDate = Math.floor(endDate.getTime() / 1000);
        let allData = [];
        const fetchSize = 2000;

        while (currentStartDate < currentEndDate) {
            const response = await fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${selectedCurrency}&tsym=USD&limit=${fetchSize}&toTs=${currentEndDate}&api_key=YOUR_API_KEY`);
            const data = await response.json();

            if (data.Response !== "Success") {
                throw new Error(data.Message);
            }

            const fetchedData = data.Data.Data;
            if (fetchedData.length === 0) break;

            fetchedData.forEach(price => {
                allData.push({ time: price.time * 1000, close: price.close });
            });

            currentEndDate = fetchedData[0].time;
        }

        allData.sort((a, b) => a.time - b.time);

        let firstChangeIndex = 0;
        for (let i = 1; i < allData.length; i++) {
            if (allData[i].close !== allData[i - 1].close) {
                firstChangeIndex = i;
                break;
            }
        }

        allData = allData.slice(firstChangeIndex);

        ohlcData.labels = allData.map(entry => new Date(entry.time));
        ohlcData.data = allData.map(entry => entry.close);

        minTime = ohlcData.labels[0].getTime();
        maxTime = ohlcData.labels[ohlcData.labels.length - 1].getTime();

        if (chart) {
            chart.destroy();
        }

        currentPrice = ohlcData.data[ohlcData.data.length - 1];

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ohlcData.labels,
                datasets: [
                    {
                        label: selectedCurrency.toUpperCase() + ' Price',
                        data: ohlcData.data,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        order: 1
                    },
                    {
                        label: 'Marked Points',
                        data: scatterData,
                        backgroundColor: 'rgba(255, 99, 132, 1)',    // rgba(139, 92, 246, 1)
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        pointRadius: 4.3,
                        pointStyle: 'circle',
                        type: 'scatter'
                    }
                ]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        min: minTime,
                        max: maxTime,
                        time: { unit: 'day' },
                        ticks: { autoSkip: true, maxTicksLimit: 20 }
                    },
                    y: {
                        position: 'right',
                        ticks: { callback: value => value.toFixed(2) }
                    }
                },
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(tooltipItem) {
                                if (tooltipItem.dataset.type === 'scatter') {
                                    const eventIndex = tooltipItem.raw.event; // Получаем номер строки
                                    return `Event: ${eventIndex.title}`;
                                } else {
                                    return `${selectedCurrency.toUpperCase()} Price: $${tooltipItem.raw.toFixed(2)}`;
                                }
                            },
                            title: function(tooltipItems) {
                                if (tooltipItems[0].dataset.type === 'scatter') {
                                    const eventIndex = tooltipItems[0].raw.event; // Получаем информацию о событии
                                    const dateText = new Date(tooltipItems[0].raw.x).toLocaleString(); // Получаем дату из x
                                    return `${dateText}  |  Table row: ${eventIndex.row}`;
                                } else {
                                    return `${tooltipItems[0].label}`;
                                }
                            }

                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x'
                        },
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            mode: 'x',
                            onZoomComplete: () => {
                                minTime = chart.options.scales.x.min;
                                maxTime = chart.options.scales.x.max;
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            currentPriceLine: {
                                type: 'line',
                                yMin: currentPrice,
                                yMax: currentPrice,
                                borderColor: 'green',
                                borderWidth: 0.5,
                                borderDash: [5, 5],
                                label: {
                                    content: `Current Price: $${currentPrice.toFixed(2)}`,
                                    enabled: true,
                                    position: 'end'
                                }
                            }
                        }
                    }
                }
            }
        });

        document.getElementById('loading').style.display = 'none';
        document.getElementById('chart').style.display = 'block';
        document.getElementById('additional-info').style.display = 'block';

        recalculateAndDisplayMarks();
        setupDragging();

    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        document.getElementById('loading').textContent = "Ошибка загрузки данных. Попробуйте еще раз.";
    }
}

function setupDragging() {
    const chartContainer = document.getElementById('chart');

    chartContainer.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            chartContainer.style.cursor = 'grabbing';
        }
    });

    chartContainer.addEventListener('mouseup', () => {
        isDragging = false;
        chartContainer.style.cursor = 'default';
    });

    chartContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        chartContainer.style.cursor = 'default';
    });

    chartContainer.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const timeRange = maxTime - minTime;
            const newMinTime = minTime - (dx * timeRange / chartContainer.clientWidth);
            const newMaxTime = maxTime - (dx * timeRange / chartContainer.clientWidth);

            minTime = newMinTime;
            maxTime = newMaxTime;

            chart.options.scales.x.min = minTime;
            chart.options.scales.x.max = maxTime;

            chart.update('none');
            startX = e.clientX;
        }
    });
}

function selectCurrency(currency) {
    selectedCurrency = currency;
    loadChartData();
    modalForm.style.display = 'none';
    modalOverlay.style.display = 'none';
}

//const openModalBtn = document.getElementById('open-modal-btn');
const openModalBtnSpan = document.querySelector('.currency-name')
const openModalBtn = document.querySelector('.open-modal-btn');
const modalForm = document.getElementById('modal-form');
const modalOverlay = document.getElementById('modal-overlay');
const closeBtn = document.querySelector('.close-btn-modal-form');

openModalBtn.addEventListener('click', function() {
    modalForm.style.display = 'block';
    modalOverlay.style.display = 'block';
});

closeBtn.addEventListener('click', function() {
    modalForm.style.display = 'none';
    modalOverlay.style.display = 'none';
});

modalOverlay.addEventListener('click', function() {
    modalForm.style.display = 'none';
    modalOverlay.style.display = 'none';
});

document.addEventListener("DOMContentLoaded", function() {
    loadChartData();
});

document.addEventListener("DOMContentLoaded", function() {
    flatpickr("#calendar", {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 2) {
                instance.clear();
                alert("Вы можете выбрать не более двух дат.");
            } else {
//                console.log("Выбранные даты:", selectedDates);
            }
        }
    });
});

const menuIcon = document.getElementById('menu-icon');
const dropdownMenu = document.getElementById('dropdown-menu');

menuIcon.addEventListener('click', function() {
    dropdownMenu.classList.toggle('hidden');
});

// Закрываем меню при клике вне его
document.addEventListener('click', function(event) {
    if (!menuIcon.contains(event.target) && !dropdownMenu.contains(event.target)) {
        dropdownMenu.classList.add('hidden');
    }
});

const modeToggle = document.getElementById('mode-toggle');

// При загрузке страницы проверяем сохранённую тему
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        modeToggle.checked = true;
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        modeToggle.checked = false;
    }
} else {
    // Если темы нет, устанавливаем по умолчанию светлый режим
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
    modeToggle.checked = false;
}

modeToggle.addEventListener('change', function() {
    if (this.checked) {
        // Включить темный режим
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        // Включить светлый режим
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
});

function selectCurrency(currency) {
    selectedCurrency = currency;
    loadChartData();
    modalForm.style.display = 'none';
    modalOverlay.style.display = 'none';

    // Обновляем текст кнопки с текущей выбранной валютой
    let currencyName;
    let iconSrc;

    switch (selectedCurrency) {
        case 'BTC':
            currencyName = 'Bitcoin (BTC)';
            iconSrc = '/static/images/bitcoin-btc-logo.png'; // Путь к иконке Биткойна
            break;
        case 'ETH':
            currencyName = 'Ethereum (ETH)';
            iconSrc = '/static/images/ethereum-eth-logo.png'; // Путь к иконке Эфира
            break;
        case 'USDT':
            currencyName = 'Tether (USDT)';
            iconSrc = '/static/images/tether-usdt-logo.png'; // Путь к иконке Tether
            break;
        default:
            currencyName = selectedCurrency;
    }

    // Устанавливаем текст и иконку в кнопку
    openModalBtn.querySelector('.currency-name').textContent = currencyName;
    openModalBtn.querySelector('img').src = iconSrc; // Обновляем источник изображения
}

document.addEventListener("DOMContentLoaded", function() {
    loadChartData();
    // Изначально отображаем Bitcoin (BTC)
    // openModalBtn.textContent = 'Bitcoin (BTC)';
    openModalBtnSpan.textContent = 'Bitcoin (BTC)';
});

function recalculateAndDisplayMarks() {
    clearMarkedPoints();
    markSelectedRows();
}

let eventsData = [];  // Массив для хранения всех данных
let currentOffset = 10;  // Индекс для пагинации
const limit = 10;  // Количество записей на страницу

let isSortedAscending = true;  // Переменная для хранения направления сортировки

// Функция для удаления панели "Event Table"
function removeEventTable() {
    let eventTablePanel = document.getElementById("event-table-panel");

    // Если панель существует, удаляем ее
    if (eventTablePanel) {
        eventTablePanel.remove();
    }
}

function removeSearchField() {
    const searchInput = document.getElementById("event-search");
    if (searchInput) {
        searchInput.remove();
    }
}

document.getElementById("additional-info-button-apply").addEventListener("click", async function() {
    const calendarInput = document.getElementById('calendar').value;

    if (!calendarInput) {
        removeEventTable();
        removeClearSelectionButton();
        removeSelectAllButton();
        removeDownloadButton();
        removeMarkButton();
        clearMarkedPoints();
        removeSearchField();
        alert("Please select a date.");
        return;
    }

    const dates = calendarInput.split(' to ');
    const fromDate = dates[0];
    const toDate = dates[1];

    try {
        const response = await fetch(`/tools?from_date=${fromDate}&to_date=${toDate}`, {
            credentials: "include"
        });

        eventsData = await response.json();
        console.log("Server response:", eventsData);

        const tableContainer = document.getElementById('table-container');
        tableContainer.innerHTML = '';

        if (eventsData.length === 0) {
            removeEventTable();
            removeClearSelectionButton();
            removeSelectAllButton();
            removeDownloadButton();
            removeMarkButton();
            clearMarkedPoints();
            removeSearchField()
            alert("No events found for the selected date.");
            return;
        }

        const table = document.createElement('table');
        table.classList.add('events-table');

        const tableHeader = document.createElement('thead');
        tableHeader.innerHTML = '<tr><th>#</th><th>Назва події</th><th>Категорія</th><th id="date-header">Дата</th><th>Посилання</th></tr>';
        table.appendChild(tableHeader);

        const tableBody = document.createElement('tbody');
        eventsData.slice(0, limit).forEach((event, index) => {
            const row = document.createElement('tr');

            const date = new Date(event.date);
            const formattedDate = date.toISOString().split('T')[0];
            const formattedTime = date.toISOString().split('T')[1].slice(0, 8);
            const formattedDateTime = `${formattedDate} | ${formattedTime}`;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${event.title}</td>
                <td>${event.category}</td>
                <td>${formattedDateTime}</td>
                <td><a href="${event.url}" target="_blank">Перейти</a></td>
            `;
            tableBody.appendChild(row);
        });

        table.appendChild(tableBody);
        tableContainer.appendChild(table);

        document.getElementById('date-header').addEventListener('click', function() {
            sortByDate();
        });

        if (eventsData.length > limit) {
//            const loadMoreButton = document.createElement('button');
//            loadMoreButton.id = 'load-more-button';
//            loadMoreButton.textContent = '+ Показати більше';
//            loadMoreButton.addEventListener('click', loadMore);
//            tableContainer.appendChild(loadMoreButton);
            addLoadButtons();
        }

        // Показуємо панель, якщо дані є
        const tableWrapper = document.getElementById("table-wrapper");
        if (!document.getElementById("event-table-panel")) {
            tableWrapper.style.display = "block";

            // Додавання поля для пошуку
            if (!document.getElementById("event-search")) {
                const searchInput = document.createElement("input");
                searchInput.type = "text";
                searchInput.id = "event-search";
                searchInput.placeholder = "search event";
                searchInput.oninput = function() {
                    filterEvents(searchInput.value);
                };

                document.getElementById("additional-info-data-container").appendChild(searchInput);
            }

            let newPanel = document.createElement("div");
            newPanel.className = "additional-info-item";
            newPanel.id = "event-table-panel";

            let containerWidth = document.getElementById("additional-info-data-container").clientWidth;
            let minWidth = 130; // Мінімальна ширина в пікселях
            newPanel.style.width = `${Math.max(containerWidth * 0.1, minWidth)}px`;

            let text = document.createElement("span");
            text.innerText = "Event Table (0)";
            text.id = "event-table-counter";

            let closeButton = document.createElement("button");
            closeButton.className = "close-btn";
            closeButton.innerText = "×";
            closeButton.onclick = function() {
                clearSelectedRows();
                newPanel.remove();
                removeSelectAllButton();
                tableWrapper.style.display = "none";
                removeSearchField();
            };

            addDownloadButton();
            addSelectAllButton();

            newPanel.appendChild(text);
            newPanel.appendChild(closeButton);
            document.getElementById("additional-info-data-container").appendChild(newPanel);
        }

    } catch (error) {
        console.error("Error fetching events:", error);
        alert("Failed to fetch events.");
    }
    currentOffset = 10;
    addRowSelectionHandlers(); // Додаємо обробники вибору рядків
});

// Функція для фільтрації подій
function filterEvents(query) {
    const rows = document.querySelectorAll('.events-table tbody tr');
    rows.forEach(row => {
        const title = row.cells[1].innerText.toLowerCase();
        if (title.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Функция для подгрузки следующей порции данных
function loadMore() {
    const tableContainer = document.getElementById('table-container');
    const table = document.querySelector('.events-table');
    const tableBody = table.querySelector('tbody');

    // Показываем следующие 10 записей
    const startIndex = currentOffset;
    const endIndex = currentOffset + limit;

    eventsData.slice(startIndex, endIndex).forEach((event, index) => {
        const row = document.createElement('tr');
        const date = new Date(event.date);
        const formattedDate = date.toISOString().split('T')[0];
        const formattedTime = date.toISOString().split('T')[1].slice(0, 8);
        const formattedDateTime = `${formattedDate} | ${formattedTime}`;

        // Нумерация теперь будет корректной, начиная с текущего offset + индекс
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>  <!-- Продолжаем нумерацию -->
            <td>${event.title}</td>
            <td>${event.category}</td>
            <td>${formattedDateTime}</td>
            <td><a href="${event.url}" target="_blank">Перейти</a></td>
        `;
        tableBody.appendChild(row);
    });

    currentOffset += limit;  // Увеличиваем offset

    // Если больше нет записей, скрываем кнопку
    if (currentOffset >= eventsData.length) {
        const loadMoreButton = document.getElementById('load-more-button');
        if (loadMoreButton) {
            loadMoreButton.style.display = 'none';
        }
    }
}









// Функция для подгрузки следующей порции данных
function loadMore() {
    const table = document.querySelector('.events-table');
    const tableBody = table.querySelector('tbody');

    // Показываем следующие 10 записей
    const startIndex = currentOffset;
    const endIndex = currentOffset + limit;

    eventsData.slice(startIndex, endIndex).forEach((event, index) => {
        const row = document.createElement('tr');
        const date = new Date(event.date);
        const formattedDate = date.toISOString().split('T')[0];
        const formattedTime = date.toISOString().split('T')[1].slice(0, 8);
        const formattedDateTime = `${formattedDate} | ${formattedTime}`;

        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${event.title}</td>
            <td>${event.category}</td>
            <td>${formattedDateTime}</td>
            <td><a href="${event.url}" target="_blank">Перейти</a></td>
        `;
        tableBody.appendChild(row);
    });

    currentOffset += limit; // Увеличиваем offset

    // Если больше нет записей, скрываем кнопки и показываем "Наверх"
    if (currentOffset >= eventsData.length) {
        document.getElementById('load-more-button').style.display = 'none';
        document.getElementById('load-all-button').style.display = 'none';
        showScrollToTopButton(); // Показываем кнопку "Наверх"
    }
}

// Функция для добавления кнопок в контейнер
function addLoadButtons() {
    let container = document.getElementById("load-buttons-container");

    // Если контейнер уже есть, не создаем новый
    if (container) return;

    // Создаем контейнер
    container = document.createElement("div");
    container.id = "load-buttons-container";
    container.style.display = "flex";
    container.style.flexDirection = "space-between"; // Выстраиваем кнопки в колонку
    container.style.alignItems = "center";
    container.style.gap = "10px";

    // Создаем кнопку Load More
    const loadMoreButton = document.createElement("button");
    loadMoreButton.id = "load-more-button";
    loadMoreButton.textContent = "Load +10";

    // Создаем кнопку Load All с динамическим значением
    const loadAllButton = document.createElement("button");
    loadAllButton.id = "load-all-button";
    loadAllButton.textContent = `Load +${eventsData.length}`;

    // Создаем кнопку "Наверх"
    const scrollToTopButton = document.createElement("button");
    scrollToTopButton.id = "scroll-to-top-button";
    scrollToTopButton.textContent = "Up";
    scrollToTopButton.style.display = "none"; // Скрыта по умолчанию
    scrollToTopButton.style.width = "100%"; // Растягиваем на всю ширину
    scrollToTopButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // Добавляем кнопки в контейнер
    container.appendChild(loadMoreButton);
    container.appendChild(loadAllButton);
    container.appendChild(scrollToTopButton);

    // Вставляем контейнер кнопок после таблицы
    document.getElementById("table-container").appendChild(container);

    // Назначаем обработчики событий
    loadMoreButton.addEventListener("click", loadMore);
    loadAllButton.addEventListener("click", loadAll);
}

// Функция для загрузки всех строк сразу
function loadAll() {
    const tableBody = document.querySelector(".events-table tbody");
    tableBody.innerHTML = ""; // Очищаем перед вставкой всех данных

    eventsData.forEach((event, index) => {
        const row = document.createElement("tr");
        const date = new Date(event.date);
        const formattedDate = date.toISOString().split("T")[0];
        const formattedTime = date.toISOString().split("T")[1].slice(0, 8);
        const formattedDateTime = `${formattedDate} | ${formattedTime}`;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${event.title}</td>
            <td>${event.category}</td>
            <td>${formattedDateTime}</td>
            <td><a href="${event.url}" target="_blank">Перейти</a></td>
        `;
        tableBody.appendChild(row);
    });

    // Скрываем кнопки Load More и Load All, показываем "Наверх"
    document.getElementById("load-more-button").style.display = "none";
    document.getElementById("load-all-button").style.display = "none";
    showScrollToTopButton();
}

// Функция для показа кнопки "Наверх"
function showScrollToTopButton() {
    document.getElementById("scroll-to-top-button").style.display = "block";
}












// Функция для сортировки по дате
function sortByDate() {
    // Переводим даты в формат, который можно сравнивать
    const rows = Array.from(document.querySelector('.events-table tbody').rows);
    rows.sort((rowA, rowB) => {
        const dateA = new Date(rowA.cells[3].textContent.split(' | ')[0]);
        const dateB = new Date(rowB.cells[3].textContent.split(' | ')[0]);

        return isSortedAscending ? dateA - dateB : dateB - dateA;
    });

    // Перезаписываем строки в таблицу
    const tableBody = document.querySelector('.events-table tbody');
    rows.forEach(row => tableBody.appendChild(row));

    // Меняем направление сортировки
    isSortedAscending = !isSortedAscending;
}

document.addEventListener("DOMContentLoaded", function() {
    const svgElement = document.getElementById('loading-svg');

    if (!svgElement) {
        console.error("SVG элемент не найден!");
        return;
    }

    const circle = svgElement.querySelector('circle');

    // Получаем текущую тему
    const isDarkMode = document.body.classList.contains('dark-mode');

    // Меняем цвет обводки круга в зависимости от темы
    if (circle) {
        circle.setAttribute('stroke', isDarkMode ? '#ECEFF4' : '#000000'); // Светлая обводка для темной темы, черная для светлой
    } else {
        console.warn("Элемент <circle> не найден в SVG.");
    }
});


// Функция для выбора строк
function toggleRowSelection(row) {
    row.classList.toggle("selected");
    updateSelectionCounter();

    checkAndToggleClearButton(); // Додаємо перевірку кнопки очищення
    checkAndToggleMarkButton();  // Додаємо перевірку кнопки mark
}

function updateSelectionCounter() {
    let selectedRows = document.querySelectorAll(".events-table tbody tr.selected").length;
    let counterElement = document.getElementById("event-table-counter");
    if (counterElement) {
        counterElement.innerText = `Event Table (${selectedRows})`;
    }

    // Если нет выбранных строк, скрываем кнопки
    if (selectedRows === 0) {
        removeClearSelectionButton(); // Удаляем кнопку очистки
        removeMarkButton(); // Удаляем кнопку "Mark"
    } else {
        addClearSelectionButton(); // Добавляем кнопку очистки, если есть выбранные строки
        checkAndToggleMarkButton(); // Проверяем и добавляем кнопку "Mark"
    }
}

// Используем делегирование событий для выбора строк
function addRowSelectionHandlers() {
    let tableBody = document.querySelector(".events-table tbody");

    // Обработчик клика на tbody
    tableBody.addEventListener("click", function (event) {
        let row = event.target.closest("tr"); // Ищем родительский tr, если клик был на элементе внутри строки
        if (row) {
            toggleRowSelection(row);
        }
    });
}

// Функция для проверки наличия таблицы и управления кнопкой очистки
function checkAndToggleClearButton() {
    let clearPanel = document.getElementById("clear-selection-panel");

    // Если нет выбранных строк, скрываем кнопку
    if (document.querySelectorAll(".events-table tbody tr.selected").length === 0) {
        if (clearPanel) {
            clearPanel.remove(); // Удаляем кнопку очистки, если нет выбранных строк
            removeMarkButton();
        }
    } else if (!clearPanel) {
        addClearSelectionButton(); // Добавляем кнопку, если есть выбранные строки
    }
}

// Функция для добавления кнопки очистки
function addClearSelectionButton() {
    let clearPanel = document.getElementById("clear-selection-panel");

    // Если кнопка очистки уже существует, просто возвращаемся
    if (clearPanel) {
        clearPanel.style.display = "flex"; // Показываем кнопку, если она скрыта
        return;
    }

    // Если кнопки очистки нет, создаем новую
    clearPanel = document.createElement("div");
    clearPanel.className = "additional-info-item";
    clearPanel.id = "clear-selection-panel";

    let clearButton = document.createElement("button");
    clearButton.className = "clear-btn"; // Измените класс для стилей
    clearButton.onclick = clearSelectedRows;

    // Создаем элемент изображения
    let clearIcon = document.createElement("img");
    clearIcon.src = "/static/images/clear-button-1.svg"; // Укажите путь к иконке
    clearIcon.alt = "Очистити вибір"; // Альтернативный текст для изображения

    clearButton.appendChild(clearIcon); // Добавляем иконку в кнопку
    clearPanel.appendChild(clearButton);

    let eventTablePanel = document.getElementById("event-table-panel");
    if (eventTablePanel) {
        eventTablePanel.parentNode.insertBefore(clearPanel, eventTablePanel.nextSibling);
    }
}

// Функция для удаления кнопки очистки
function removeClearSelectionButton() {
    let clearPanel = document.getElementById("clear-selection-panel");
    if (clearPanel) {
        clearPanel.remove(); // Удаляем элемент из DOM
    }
}

// Функция для очистки выбранных строк
function clearSelectedRows() {
    document.querySelectorAll(".selected").forEach(row => row.classList.remove("selected"));
    clearMarkedPoints();
    updateEventCounter(0); // Обновляем счетчик событий
    checkAndToggleClearButton(); // Проверяем и скрываем кнопку очистки, если она пустая
}

// Функция для обновления счетчика
function updateEventCounter(count) {
    const textElement = document.getElementById("event-table-counter");
    if (textElement) {
        textElement.innerText = `Event Table (${count})`;
    }
}

function addDownloadButton() {
    let downloadPanel = document.getElementById("download-selection-panel");

    if (downloadPanel) return; // Если кнопка уже есть, выходим

    let eventTablePanel = document.getElementById("event-table-panel");

    if (eventTablePanel) {
        insertDownloadButton(eventTablePanel);
    } else {
        let observer = new MutationObserver(function (mutations, obs) {
            let eventTablePanel = document.getElementById("event-table-panel");
            if (eventTablePanel) {
                insertDownloadButton(eventTablePanel);
                obs.disconnect(); // Останавливаем отслеживание
            }
        });

        observer.observe(document.getElementById("additional-info-data-container"), {
            childList: true,
            subtree: false
        });
    }
}

function insertDownloadButton(eventTablePanel) {
    let downloadPanel = document.createElement("div");
    downloadPanel.className = "additional-info-item";
    downloadPanel.id = "download-selection-panel";

    let downloadButton = document.createElement("button");
    downloadButton.className = "download-btn";

    let downloadIcon = document.createElement("img");
    downloadIcon.src = "/static/images/download-icon.svg"; // Проверь путь к иконке
    downloadIcon.alt = "Завантажити";

    downloadButton.appendChild(downloadIcon);
    downloadPanel.appendChild(downloadButton);

    // Добавляем кнопку после eventTablePanel
    eventTablePanel.insertAdjacentElement("afterend", downloadPanel);

    // Добавляем обработчик на клик
    downloadButton.addEventListener("click", downloadTableAsJson);
}

// Функция для скачивания таблицы в JSON
function downloadTableAsJson() {
    if (eventsData.length === 0) {
        alert("Таблиця порожня. Немає даних для завантаження.");
        return;
    }

    const jsonData = JSON.stringify(eventsData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "events_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// Удаление кнопки скачивания при закрытии таблицы
function removeDownloadButton() {
    let downloadPanel = document.getElementById("download-selection-panel");
    if (downloadPanel) {
        downloadPanel.remove();
    }
}

// Вызываем при клике "Apply"
document.getElementById("additional-info-button-apply").addEventListener("click", function () {
    updateEventCounter(0);
    // removeDownloadButton();

    // Проверяем и переключаем кнопку очистки
    checkAndToggleClearButton();

    const calendarInput = document.getElementById('calendar').value;
    if (!calendarInput) {
        return; // Выход из функции, если дата не выбрана
    } else if (eventsData.length === 0) {
        return; // Выход из функции, если нет событий
    }

    // Дополнительная логика для загрузки событий
    //addDownloadButton(); // Добавляем кнопку только после успешной загрузки
});

// Добавляем удаление кнопки при закрытии таблицы
document.addEventListener("click", function (event) {
    if (event.target.classList.contains("close-btn")) {
        removeDownloadButton();
    }
});

function markSelectedRows() {
    let selectedRows = document.querySelectorAll(".events-table tbody tr.selected");

    if (selectedRows.length === 0) {
        return;
    }

    selectedRows.forEach((row) => {
        let cells = row.getElementsByTagName("td");

        if (cells.length < 4) {
            return;
        }

        let dateText = cells[3].textContent.trim();
        let dateParts = dateText.split(" | ");
        let markX = dateParts.length > 1
            ? new Date(dateParts[0] + " " + dateParts[1]).getTime()
            : new Date(dateText).getTime();

        if (isNaN(markX)) {
            console.error("Ошибка: Неверные данные в строке.", { dateText, markX });
            return;
        }

        // Находим соответствующее значение Y на графике
        let markY = findPriceAtTime(markX);

        if (markY === null) {
            console.error("Ошибка: Не удалось определить цену для времени", markX);
            return;
        }

        // Проверяем, существует ли уже точка с такими координатами
        const exists = scatterData.some(point => point.x === markX && point.y === markY);
        if (exists) {
            return; // Если точка существует, не добавляем её
        }

        // Отримуємо номер рядка з першої комірки (index 0)
        let rowNumber = cells[0].textContent.trim(); // Номер рядка з таблиці

        // Додаємо метку з інформацією про подію
        scatterData.push({
            x: markX,
            y: markY,
            event: {
                title: cells[1].textContent.trim(),
                row: rowNumber // Використовуємо номер рядка з таблиці
            },
            order: 2
        });
    });

    // Обновляем график
    chart.data.datasets[1].data = scatterData;

    // Обновляем график, не меняя настройки тултипов
    chart.update();
}

function clearMarkedPoints() {
    // Очищаємо масив з мітками
    scatterData = [];
    // Оновлюємо дані на графіку
    chart.data.datasets[1].data = scatterData;
    // Оновлюємо графік, щоб відобразити зміни
    chart.update();
}

// **Функция поиска цены по времени**
function findPriceAtTime(timestamp) {
    for (let i = 0; i < ohlcData.labels.length; i++) {
        let time = ohlcData.labels[i].getTime();
        let price = ohlcData.data[i];

        if (time === timestamp) {
            return price; // Точное совпадение
        } else if (time > timestamp && i > 0) {
            // Линейная интерполяция между ближайшими значениями
            let prevTime = ohlcData.labels[i - 1].getTime();
            let prevPrice = ohlcData.data[i - 1];

            let ratio = (timestamp - prevTime) / (time - prevTime);
            return prevPrice + ratio * (price - prevPrice);
        }
    }

    return null; // Если не нашли подходящее значение
}

// Обновленная функция addMarkButton
function addMarkButton() {
    let markPanel = document.getElementById("mark-selection-panel");

    if (markPanel) {
        markPanel.style.display = "flex";
        return;
    }

    markPanel = document.createElement("div");
    markPanel.className = "additional-info-item";
    markPanel.id = "mark-selection-panel";

    let markButton = document.createElement("button");
    markButton.className = "mark-btn";

    markButton.onclick = function() {
        recalculateAndDisplayMarks();
    };

    markButton.textContent = "mark graphic";
    markPanel.appendChild(markButton);

    let downloadPanel = document.getElementById("download-selection-panel");
    if (downloadPanel) {
        downloadPanel.parentNode.insertBefore(markPanel, downloadPanel.nextSibling);
    } else {
        let eventTablePanel = document.getElementById("event-table-panel");
        eventTablePanel.parentNode.insertBefore(markPanel, eventTablePanel.nextSibling);
    }
}

function removeMarkButton() {
    let markPanel = document.getElementById("mark-selection-panel");
    if (markPanel) {
        markPanel.parentNode.removeChild(markPanel); // Видаляємо панель кнопки "Mark"
    }
}

function checkAndToggleMarkButton() {
    let markPanel = document.getElementById("mark-selection-panel");

    // Перевіряємо, чи є вибрані рядки
    let selectedRowsCount = document.querySelectorAll(".events-table tbody tr.selected").length;

    if (selectedRowsCount > 0) {
        if (!markPanel) {
            addMarkButton(); // Додаємо кнопку "Mark", якщо вона відсутня
        }
    } else if (markPanel) {
        markPanel.remove(); // Видаляємо кнопку "Mark", якщо немає вибраних рядків
    }
}

let observer; // Объявляем переменную для MutationObserver
let selectingAll = false; // Флаг для отслеживания выделения всех строк

function addSelectAllButton() {
    let selectAllPanel = document.getElementById("select-all-panel");

    if (selectAllPanel) return; // Если кнопка уже есть, выходим

    let eventTablePanel = document.getElementById("event-table-panel");

    if (eventTablePanel) {
        insertSelectAllButton(eventTablePanel);
        startObservingTable(); // Начинаем наблюдение за таблицей
    } else {
        observer = new MutationObserver(function (mutations, obs) {
            let eventTablePanel = document.getElementById("event-table-panel");
            if (eventTablePanel) {
                insertSelectAllButton(eventTablePanel);
                startObservingTable(); // Начинаем наблюдение за таблицей
                obs.disconnect(); // Останавливаем отслеживание
            }
        });

        observer.observe(document.getElementById("additional-info-data-container"), {
            childList: true,
            subtree: false
        });
    }
}

function insertSelectAllButton(eventTablePanel) {
    let selectAllPanel = document.createElement("div");
    selectAllPanel.className = "additional-info-item";
    selectAllPanel.id = "select-all-panel";

    let selectAllButton = document.createElement("button");
    selectAllButton.className = "select-all-btn"; // Можно добавить класс для стилей

    let selectAllIcon = document.createElement("img");
    selectAllIcon.src = "/static/images/select-all-svgrepo-com.svg"; // Проверь путь к иконке
    selectAllIcon.alt = "Виділити все";

    selectAllButton.appendChild(selectAllIcon);
    selectAllPanel.appendChild(selectAllButton);

    // Добавляем кнопку после eventTablePanel
    eventTablePanel.insertAdjacentElement("afterend", selectAllPanel);

    // Добавляем обработчик на клик
    selectAllButton.addEventListener("click", () => {
        selectingAll = !selectingAll; // Переключаем состояние выделения
        if (selectingAll) {
            selectAllRows(); // Выделяем все строки
        }
    });
}

function startObservingTable() {
    let tableBody = document.querySelector(".events-table tbody");

    observer = new MutationObserver(function (mutations) {
        // Здесь не выделяем строки, только наблюдаем за изменениями
    });

    observer.observe(tableBody, {
        childList: true, // Отслеживаем добавление/удаление дочерних элементов
        subtree: true // Также отслеживаем вложенные элементы
    });
}

function selectAllRows() {
    // Создаем массив для хранения всех строк
    let allRows = Array.from(document.querySelectorAll(".events-table tbody tr")); // Выбираем все строки в таблице
    allRows.forEach(row => {
        row.classList.add("selected"); // Выделяем строку, добавляя класс
    });

    updateSelectionCounter(); // Обновляем счетчик выделенных строк
}

function removeSelectAllButton() {
    let selectAllPanel = document.getElementById("select-all-panel");

    if (selectAllPanel) {
        selectAllPanel.remove(); // Удаляем панель с кнопкой
    }

    if (observer) {
        observer.disconnect(); // Останавливаем наблюдение за изменениями в таблице
        observer = null;
    }
}
