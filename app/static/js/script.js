const ctx = document.getElementById('chart').getContext('2d');
let chart;
let isDragging = false;
let startX, startY;
let minTime, maxTime;
let currentPrice = 0;

const startDate = new Date("2010-01-01");
const endDate = new Date();
let selectedCurrency = 'BTC'; // Изначально отображается Bitcoin

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

const openModalBtn = document.getElementById('open-modal-btn');
const modalForm = document.getElementById('modal-form');
const modalOverlay = document.getElementById('modal-overlay');
const closeBtn = document.querySelector('.close-btn');

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

modeToggle.addEventListener('change', function() {
    if (this.checked) {
        // Включить темный режим
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        // Включить светлый режим
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
});


function selectCurrency(currency) {
    selectedCurrency = currency;
    loadChartData();
    modalForm.style.display = 'none';
    modalOverlay.style.display = 'none';
    // Обновляем текст кнопки с текущей выбранной валютой
    let currencyName;
    switch (selectedCurrency) {
        case 'BTC':
            currencyName = 'Bitcoin (BTC)';
            break;
        case 'ETH':
            currencyName = 'Ethereum (ETH)';
            break;
        case 'LTC':
            currencyName = 'Litecoin (LTC)';
            break;
        default:
            currencyName = selectedCurrency;
    }
    openModalBtn.textContent = currencyName;
}

document.addEventListener("DOMContentLoaded", function() {
    loadChartData();
    // Изначально отображаем Bitcoin (BTC)
    openModalBtn.textContent = 'Bitcoin (BTC)';
});