const ctx = document.getElementById('chart').getContext('2d');
let chart;
let isDragging = false;
let startX, startY;
let minTime, maxTime;
let currentPrice = 0;

const startDate = new Date("2010-01-01");
const endDate = new Date();
let selectedCurrency = 'BTC';

async function loadChartData() {
    const ohlcData = { labels: [], data: [] };

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

        // Фільтрація: знаходимо перший момент зміни ціни
        let firstChangeIndex = 0;
        for (let i = 1; i < allData.length; i++) {
            if (allData[i].close !== allData[i - 1].close) {
                firstChangeIndex = i;
                break;
            }
        }

        // Обрізаємо дані до першої зміни ціни
        allData = allData.slice(firstChangeIndex);

        allData.forEach(entry => {
            ohlcData.labels.push(new Date(entry.time));
            ohlcData.data.push(entry.close);
        });

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
                datasets: [{
                    label: selectedCurrency.toUpperCase() + ' Price',
                    data: ohlcData.data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }]
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
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
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
                console.log("Выбранные даты:", selectedDates);
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



//// без подгрузки
//document.getElementById('additional-info-button-apply').addEventListener('click', async function() {
//    const calendarInput = document.getElementById('calendar').value;
//
//    if (!calendarInput) {
//        alert("Please select a date.");
//        return;
//    }
//
//    // Разбиваем значение ввода на два диапазона: from_date и to_date
//    const dates = calendarInput.split(' to ');
//    const fromDate = dates[0];
//    const toDate = dates[1];
//
//    try {
//        // Отправляем запрос на сервер с правильным диапазоном дат
//        const response = await fetch(`/tools?from_date=${fromDate}&to_date=${toDate}`);
//        const events = await response.json();
//
//        console.log("Server response:", events);  // Логируем данные ответа для проверки
//
//        // Создаем таблицу с данными
//        const tableContainer = document.getElementById('table-container');
//        tableContainer.innerHTML = ''; // Очищаем предыдущую таблицу
//
//        if (events.length === 0) {
//            tableContainer.innerHTML = '<p>No events found for the selected date.</p>';
//            return;
//        }
//
//        // Создаем таблицу
//        const table = document.createElement('table');
//        table.classList.add('events-table');
//
//        // Заголовок таблицы
//        const tableHeader = document.createElement('thead');
//        tableHeader.innerHTML = '<tr><th>#</th><th>Назва події</th><th>Категорія</th><th>Дата</th><th>Посилання</th></tr>';
//        table.appendChild(tableHeader);
//
//        // Тело таблицы с данными из ответа
//        const tableBody = document.createElement('tbody');
//        events.forEach((event, index) => {
//            const row = document.createElement('tr');
//
//            // Преобразуем дату из формата ISO в нужный формат (YYYY-MM-DD | HH:mm:ss)
//            const date = new Date(event.date);
//            const formattedDate = date.toISOString().split('T')[0];  // Получаем только дату (YYYY-MM-DD)
//            const formattedTime = date.toISOString().split('T')[1].slice(0, 8);  // Получаем время (HH:mm:ss)
//            const formattedDateTime = `${formattedDate} | ${formattedTime}`;
//
//            row.innerHTML = `
//                <td>${index + 1}</td> <!-- Нумерация начинается с 1 -->
//                <td>${event.title}</td>
//                <td>${event.category}</td>
//                <td>${formattedDateTime}</td> <!-- Отображаем отформатированную дату и время -->
//                <td><a href="${event.url}" target="_blank">Перейти</a></td>
//            `;
//            tableBody.appendChild(row);
//        });
//
//        table.appendChild(tableBody);
//        tableContainer.appendChild(table);
//
//    } catch (error) {
//        console.error("Error fetching events:", error);
//        alert("Failed to fetch events.");
//    }
//});




let eventsData = [];  // Массив для хранения всех данных
let currentOffset = 10;  // Индекс для пагинации
const limit = 10;  // Количество записей на страницу

let isSortedAscending = true;  // Переменная для хранения направления сортировки

document.getElementById("additional-info-button-apply").addEventListener("click", async function() {
    const calendarInput = document.getElementById('calendar').value;

    if (!calendarInput) {
        alert("Please select a date.");
        return; // Важно завершить выполнение функции, чтобы не происходило дальнейших действий
    }

    const dates = calendarInput.split(' to ');
    const fromDate = dates[0];
    const toDate = dates[1];

    try {
        const response = await fetch(`/tools?from_date=${fromDate}&to_date=${toDate}`);
        eventsData = await response.json();

        console.log("Server response:", eventsData);

        const tableContainer = document.getElementById('table-container');
        tableContainer.innerHTML = '';

        if (eventsData.length === 0) {
            // Здесь мы вызываем alert только один раз, если данных нет
            alert("No events found for the selected date.");
            return; // Прерываем выполнение функции, если нет данных
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
            const loadMoreButton = document.createElement('button');
            loadMoreButton.id = 'load-more-button';
            loadMoreButton.textContent = '+ Показати більше';
            loadMoreButton.addEventListener('click', loadMore);
            tableContainer.appendChild(loadMoreButton);
        }

        // Если данные есть, показываем панель
        const tableWrapper = document.getElementById("table-wrapper");
        if (!document.getElementById("event-table-panel")) {
            tableWrapper.style.display = "block";

            let newPanel = document.createElement("div");
            newPanel.className = "additional-info-item";
            newPanel.id = "event-table-panel";

            let containerWidth = document.getElementById("additional-info-data-container").clientWidth;
            let minWidth = 130; // Минимальная ширина в пикселях
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
                tableWrapper.style.display = "none";
            };

            newPanel.appendChild(text);
            newPanel.appendChild(closeButton);
            document.getElementById("additional-info-data-container").appendChild(newPanel);
        }

    } catch (error) {
        console.error("Error fetching events:", error);
        alert("Failed to fetch events.");
    }

    addRowSelectionHandlers(); // Добавляем обработчики выбора строк
});

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
    const svgObject = document.getElementById('loading-svg');

    svgObject.addEventListener('load', function() {
        const svgDoc = svgObject.contentDocument; // Получаем доступ к содержимому SVG

        const text = svgDoc.querySelector('text');
        const rect = svgDoc.querySelector('rect'); // Если у вас есть элемент <rect> для фона, например

        // Получаем текущую тему
        const isDarkMode = document.body.classList.contains('dark-mode');

        // Если есть элемент <rect> для фона, меняем его цвет
        if (rect) {
            rect.setAttribute('fill', isDarkMode ? '#0f1021' : '#ffffff'); // Темный фон для темной темы, белый для светлой
        }

        // Меняем цвет текста в SVG в зависимости от темы
        if (text) {
            text.setAttribute('fill', isDarkMode ? '#ECEFF4' : '#000000'); // Светлый текст для темной темы, черный для светлой
        }
    });
});

// Функция для выбора строк
function toggleRowSelection(row) {
    row.classList.toggle("selected");
    updateSelectionCounter();

    checkAndToggleClearButton(); // Додаємо перевірку кнопки очищення
}

// Функция для обновления счетчика
//function updateSelectionCounter() {
//    let selectedRows = document.querySelectorAll(".events-table tbody tr.selected").length;
//    let counterElement = document.getElementById("event-table-counter");
//    if (counterElement) {
//        counterElement.innerText = `Event Table (${selectedRows})`;
//    }
//}

function updateSelectionCounter() {
    let selectedRows = document.querySelectorAll(".events-table tbody tr.selected").length;
    let counterElement = document.getElementById("event-table-counter");
    if (counterElement) {
        counterElement.innerText = `Event Table (${selectedRows})`;
    }

    // Если нет выбранных строк, скрываем кнопку очистки
    if (selectedRows === 0) {
        let clearPanel = document.getElementById("clear-selection-panel");
        if (clearPanel) {
            clearPanel.style.display = "none"; // Скрываем кнопку
        }
    } else {
        addClearSelectionButton(); // Добавляем кнопку, если есть выбранные строки
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
    let eventTablePanel = document.getElementById("event-table-panel");
    let clearPanel = document.getElementById("clear-selection-panel");

    if (eventTablePanel) {
        if (!clearPanel) {
            addClearSelectionButton();
        }
    } else if (clearPanel) {
        clearPanel.remove();
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

// Функция для очистки выбранных строк
function clearSelectedRows() {
    document.querySelectorAll(".selected").forEach(row => row.classList.remove("selected"));
    updateEventCounter(0); // Обновляем счетчик событий
    checkAndToggleClearButton(); // Проверяем и скрываем кнопку очистки, если она пустая
}

// Функция для проверки наличия таблицы и управления кнопкой очистки
function checkAndToggleClearButton() {
    let clearPanel = document.getElementById("clear-selection-panel");

    // Если нет выбранных строк, скрываем кнопку
    if (document.querySelectorAll(".events-table tbody tr.selected").length === 0) {
        if (clearPanel) {
            clearPanel.remove(); // Удаляем кнопку очистки, если нет выбранных строк
        }
    } else if (!clearPanel) {
        addClearSelectionButton(); // Добавляем кнопку, если есть выбранные строки
    }
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
    checkAndToggleClearButton();
    addDownloadButton();
});

// Добавляем удаление кнопки при закрытии таблицы
document.addEventListener("click", function (event) {
    if (event.target.classList.contains("close-btn")) {
        removeDownloadButton();
    }
});










