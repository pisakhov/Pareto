/**
 * Chart Manager - Handles forecasting vs actuals visualization
 */
window.chartManager = (function() {
    let chart = null;

    // Destroy existing chart
    function destroyChart() {
        if (chart) {
            chart.destroy();
            chart = null;
        }
    }

    // Initialize the chart
    function initChart() {
        // Destroy any existing chart first
        destroyChart();

        const ctx = document.getElementById('forecastActualsChart');
        if (!ctx) return;

        const chartConfig = {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Forecast',
                        data: [],
                        borderColor: 'rgb(251, 146, 60)',
                        backgroundColor: 'rgba(251, 146, 60, 0.15)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: 'rgb(251, 146, 60)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointStyle: 'circle'
                    },
                    {
                        label: 'Actuals',
                        data: [],
                        borderColor: 'rgb(37, 91, 227)',
                        backgroundColor: 'rgba(37, 91, 227, 0.15)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: 'rgb(37, 91, 227)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointStyle: 'circle'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US').format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US', {
                                    notation: 'compact',
                                    compactDisplay: 'short'
                                }).format(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        };

        chart = new Chart(ctx, chartConfig);
    }

    // Build time series data
    function buildTimeSeriesData() {
        if (!window.forecastManager) {
            return { labels: [], forecastData: [], actualData: [] };
        }

        // Get all forecast and actual entries across all years
        const forecastMap = new Map();
        const actualMap = new Map();

        // Build maps of year-month to value
        window.forecastManager.forecasts.forEach(f => {
            const key = `${f.year}-${f.month.toString().padStart(2, '0')}`;
            forecastMap.set(key, f.forecast_units);
        });

        window.forecastManager.actuals.forEach(a => {
            const key = `${a.year}-${a.month.toString().padStart(2, '0')}`;
            actualMap.set(key, a.actual_units);
        });

        // Get all unique dates and sort them chronologically
        const allDates = new Set([...forecastMap.keys(), ...actualMap.keys()]);
        const sortedDates = Array.from(allDates).sort();

        // Generate labels and data arrays
        const labels = [];
        const forecastData = [];
        const actualData = [];

        sortedDates.forEach(date => {
            const [year, month] = date.split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
            labels.push(dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

            forecastData.push(forecastMap.get(date) || null);
            actualData.push(actualMap.get(date) || null);
        });

        return { labels, forecastData, actualData };
    }

    // Update chart with forecast data
    function updateForecastData(forecastData) {
        chart.data.datasets[0].data = forecastData;
        chart.update('none');
    }

    // Update chart with actual data
    function updateActualData(actualData) {
        chart.data.datasets[1].data = actualData;
        chart.update('none');
    }

    // Update chart with both forecast and actual data
    function updateChartData(forecastData, actualData) {
        chart.data.datasets[0].data = forecastData;
        chart.data.datasets[1].data = actualData;
        chart.update('none');
    }

    // Refresh chart with current data from forecastManager
    function refreshChart() {
        if (!chart) return;

        const { labels, forecastData, actualData } = buildTimeSeriesData();

        chart.data.labels = labels;
        chart.data.datasets[0].data = forecastData;
        chart.data.datasets[1].data = actualData;

        chart.update('none');
    }

    // Initialize chart on page load
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initChart, 100);
    });

    // Return public API
    return {
        initChart: initChart,
        destroyChart: destroyChart,
        updateForecastData: updateForecastData,
        updateActualData: updateActualData,
        updateChartData: updateChartData,
        refreshChart: refreshChart
    };
})();
