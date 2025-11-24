/**
 * Forecast Manager - Handles forecasting and actuals tracking with timeline UI
 */
class ForecastManager {
    constructor() {
        this.forecasts = [];
        this.actuals = [];
        this.currentForecastYear = new Date().getFullYear();

        this.monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
    }

    reset() {
        this.forecasts = [];
        this.actuals = [];
        this.currentForecastYear = new Date().getFullYear();
        this.renderTimelines();
    }

    addForecast(year, month, forecastUnits) {
        const id = `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.forecasts.push({
            id: id,
            year: parseInt(year),
            month: parseInt(month),
            forecast_units: parseInt(forecastUnits)
        });
        this.renderTimelines();

        // Auto-advance to next month/year
        this.advanceToNextMonth('forecast');
    }

    removeForecast(id) {
        this.forecasts = this.forecasts.filter(f => f.id !== id);
        this.renderTimelines();
    }

    removeForecastForMonth(year, month) {
        this.forecasts = this.forecasts.filter(f => !(f.year === year && f.month === month));
        this.renderTimelines();
    }

    addActual(year, month, actualUnits) {
        const id = `actual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.actuals.push({
            id: id,
            year: parseInt(year),
            month: parseInt(month),
            actual_units: parseInt(actualUnits)
        });
        this.renderTimelines();

        // Auto-advance to next month/year
        this.advanceToNextMonth('actual');
    }

    removeActual(id) {
        this.actuals = this.actuals.filter(a => a.id !== id);
        this.renderTimelines();
    }

    removeActualForMonth(year, month) {
        this.actuals = this.actuals.filter(a => !(a.year === year && a.month === month));
        this.renderTimelines();
    }

    advanceToNextMonth(type) {
        if (type === 'forecast') {
            let nextMonth = this.currentForecastMonth || 1;
            let nextYear = this.currentForecastYear;
            nextMonth++;
            if (nextMonth > 12) {
                nextMonth = 1;
                nextYear++;
            }
            this.currentForecastMonth = nextMonth;
            this.currentForecastYear = nextYear;
        }
        // Note: actuals now use the same year as forecasts
    }

    getForecastData() {
        return this.forecasts.map(f => ({
            year: f.year,
            month: f.month,
            forecast_units: f.forecast_units
        }));
    }

    getActualData() {
        return this.actuals.map(a => ({
            year: a.year,
            month: a.month,
            actual_units: a.actual_units
        }));
    }

    getForecastForMonth(year, month) {
        return this.forecasts.find(f => f.year === year && f.month === month);
    }

    getActualForMonth(year, month) {
        return this.actuals.find(a => a.year === year && a.month === month);
    }

    renderTimelines() {
        this.renderCombinedTimeline();
        this.updateChart();
    }

    updateChart() {
        if (window.chartManager) {
            window.chartManager.refreshChart();
        }
    }

    renderCombinedTimeline() {
        const forecastContainer = document.getElementById('forecastTimeline');
        const actualContainer = document.getElementById('actualTimeline');
        const monthHeaderContainer = document.getElementById('monthHeaderRow');
        const currentYearDisplay = document.getElementById('currentYearDisplay');

        currentYearDisplay.textContent = this.currentForecastYear;

        const months = [];
        for (let i = 0; i < 12; i++) {
            const forecast = this.getForecastForMonth(this.currentForecastYear, i + 1);
            const actual = this.getActualForMonth(this.currentForecastYear, i + 1);

            months.push({
                month: i + 1,
                name: this.monthNames[i],
                forecastValue: forecast ? forecast.forecast_units : '',
                forecastId: forecast ? forecast.id : null,
                actualValue: actual ? actual.actual_units : '',
                actualId: actual ? actual.id : null
            });
        }

        // Render month header row
        monthHeaderContainer.innerHTML = months.map(m => `
            <div class="text-center">
                <div class="text-xs font-medium text-muted-foreground">${m.name}</div>
            </div>
        `).join('');

        // Render forecast row
        forecastContainer.innerHTML = months.map(m => `
            <div class="month-cell" data-tab-index="${months.indexOf(m) * 2}">
                <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value="${m.forecastValue}"
                    class="w-full text-center text-sm font-semibold bg-transparent border border-border rounded px-2 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none ${m.forecastValue ? 'text-green-600' : 'text-muted-foreground'}"
                    onchange="window.forecastManager.updateForecastValue(${m.month}, this.value)"
                    oninput="if(this.value) { this.classList.add('text-green-600'); this.classList.remove('text-muted-foreground'); } else { this.classList.remove('text-green-600'); this.classList.add('text-muted-foreground'); }"
                    data-tab-index="${months.indexOf(m) * 2}"
                    data-month="${m.month}"
                />
            </div>
        `).join('');

        // Render actual row
        actualContainer.innerHTML = months.map(m => `
            <div class="month-cell" data-tab-index="${months.indexOf(m) * 2 + 1}">
                <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value="${m.actualValue}"
                    class="w-full text-center text-sm font-semibold bg-transparent border border-border rounded px-2 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none ${m.actualValue ? 'text-blue-600' : 'text-muted-foreground'}"
                    onchange="window.forecastManager.updateActualValue(${m.month}, this.value)"
                    oninput="if(this.value) { this.classList.add('text-blue-600'); this.classList.remove('text-muted-foreground'); } else { this.classList.remove('text-blue-600'); this.classList.add('text-muted-foreground'); }"
                    data-tab-index="${months.indexOf(m) * 2 + 1}"
                    data-month="${m.month}"
                />
            </div>
        `).join('');

        // Setup tab navigation after rendering
        this.setupTabNavigation();
    }

    updateForecastValue(month, value) {
        if (!value) {
            this.removeForecastForMonth(this.currentForecastYear, month);
            this.renderTimelines();
            return;
        }

        const numValue = parseInt(value);
        if (numValue < 0) return;

        const forecast = this.getForecastForMonth(this.currentForecastYear, month);
        if (forecast) {
            forecast.forecast_units = numValue;
        } else {
            this.addForecast(this.currentForecastYear, month, numValue);
            return;
        }

        this.renderTimelines();
    }

    updateActualValue(month, value) {
        if (!value) {
            this.removeActualForMonth(this.currentForecastYear, month);
            this.renderTimelines();
            return;
        }

        const numValue = parseInt(value);
        if (numValue < 0) return;

        const actual = this.getActualForMonth(this.currentForecastYear, month);
        if (actual) {
            actual.actual_units = numValue;
        } else {
            this.addActual(this.currentForecastYear, month, numValue);
            return;
        }

        this.renderTimelines();
    }

    setupTabNavigation() {
        const allInputs = document.querySelectorAll('#forecastTimeline input, #actualTimeline input');

        allInputs.forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const currentIndex = parseInt(input.getAttribute('data-tab-index'));
                    let nextIndex;

                    if (!e.shiftKey) {
                        // Forward tab
                        nextIndex = (currentIndex + 1) % allInputs.length;
                    } else {
                        // Backward tab
                        nextIndex = (currentIndex - 1 + allInputs.length) % allInputs.length;
                    }

                    e.preventDefault();
                    allInputs[nextIndex].focus();
                }
            });
        });
    }

    clearAllForecasts() {
        this.forecasts = [];
        this.renderTimelines();
    }

    clearAllActuals() {
        this.actuals = [];
        this.renderTimelines();
    }

    applyAllForecasts() {
        const firstInput = document.querySelector('#forecastTimeline input[data-month="1"]');

        if (!firstInput || firstInput.value === '') {
            this.forecasts = this.forecasts.filter(f => f.year !== this.currentForecastYear);
            this.renderTimelines();
            return;
        }

        const value = parseInt(firstInput.value);
        if (value < 0) return;

        this.forecasts = this.forecasts.filter(f => f.year !== this.currentForecastYear);

        for (let month = 1; month <= 12; month++) {
            const id = `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.forecasts.push({
                id: id,
                year: this.currentForecastYear,
                month: month,
                forecast_units: value
            });
        }

        this.renderTimelines();
    }

    applyAllActuals() {
        const firstInput = document.querySelector('#actualTimeline input[data-month="1"]');

        if (!firstInput || firstInput.value === '') {
            this.actuals = this.actuals.filter(a => a.year !== this.currentForecastYear);
            this.renderTimelines();
            return;
        }

        const value = parseInt(firstInput.value);
        if (value < 0) return;

        this.actuals = this.actuals.filter(a => a.year !== this.currentForecastYear);

        for (let month = 1; month <= 12; month++) {
            const id = `actual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.actuals.push({
                id: id,
                year: this.currentForecastYear,
                month: month,
                actual_units: value
            });
        }

        this.renderTimelines();
    }

    setupEventHandlers() {
        // Year navigation
        const prevYear = document.getElementById('prevYear');
        if (prevYear) {
            prevYear.addEventListener('click', () => {
                this.currentForecastYear--;
                this.renderTimelines();
            });
        }

        const nextYear = document.getElementById('nextYear');
        if (nextYear) {
            nextYear.addEventListener('click', () => {
                this.currentForecastYear++;
                this.renderTimelines();
            });
        }

        const clearAllForecasts = document.getElementById('clearAllForecasts');
        if (clearAllForecasts) {
            clearAllForecasts.addEventListener('click', () => this.clearAllForecasts());
        }

        const clearAllActuals = document.getElementById('clearAllActuals');
        if (clearAllActuals) {
            clearAllActuals.addEventListener('click', () => this.clearAllActuals());
        }

        const applyAllForecasts = document.getElementById('applyAllForecasts');
        if (applyAllForecasts) {
            applyAllForecasts.addEventListener('click', () => this.applyAllForecasts());
        }

        const applyAllActuals = document.getElementById('applyAllActuals');
        if (applyAllActuals) {
            applyAllActuals.addEventListener('click', () => this.applyAllActuals());
        }
    }

    loadFromProduct(product) {
        this.forecasts = [];
        this.actuals = [];

        if (product.forecasts) {
            product.forecasts.forEach(f => {
                this.forecasts.push({
                    id: `forecast_${f.forecast_id}`,
                    year: f.year,
                    month: f.month,
                    forecast_units: f.forecast_units
                });
            });
        }

        if (product.actuals) {
            product.actuals.forEach(a => {
                this.actuals.push({
                    id: `actual_${a.actual_id}`,
                    year: a.year,
                    month: a.month,
                    actual_units: a.actual_units
                });
            });
        }

        // Set current year to the latest forecast/actual year or current year
        const latestForecastYear = this.forecasts.length > 0
            ? Math.max(...this.forecasts.map(f => f.year))
            : new Date().getFullYear();
        const latestActualYear = this.actuals.length > 0
            ? Math.max(...this.actuals.map(a => a.year))
            : new Date().getFullYear();

        this.currentForecastYear = Math.max(latestForecastYear, latestActualYear);

        this.renderTimelines();
    }
}
