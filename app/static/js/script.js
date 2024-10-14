document.addEventListener('DOMContentLoaded', function () {
    // Example data for the chart
    const chartData = [
        [Date.UTC(2022, 10, 5), 45000],
        [Date.UTC(2022, 10, 6), 47000],
        [Date.UTC(2022, 10, 7), 48000],
        [Date.UTC(2022, 10, 8), 46000],
        // More data points...
    ];

    Highcharts.chart('chart', {
        chart: {
            type: 'line'
        },
        title: {
            text: 'Bitcoin Price'
        },
        xAxis: {
            type: 'datetime',
            title: {
                text: 'Date'
            }
        },
        yAxis: {
            title: {
                text: 'Price (USD)'
            }
        },
        series: [{
            name: 'BTC/USD',
            data: chartData,
            tooltip: {
                pointFormat: '{point.x:%e %b %Y}: <b>{point.y:.2f} USD</b>'
            }
        }]
    });

    // Apply button logic for future functionality
    document.getElementById('apply-button').addEventListener('click', function () {
        const selectedDate = document.getElementById('date-input').value;
        console.log('Selected Date:', selectedDate);
        // You can add a function to update the chart based on the selected date
    });
});
