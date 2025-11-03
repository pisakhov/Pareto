/**
 * Forecast Manager - Handles forecasting and actuals tracking with timeline UI
 */
class ForecastManager {
    constructor() {
        this.forecasts = [];
        this.actuals = [];
        this.currentForecastYear = new Date().getFullYear();
        this.currentActualYear = new Date().getFullYear();

        this.monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
    }

    reset() {
        this.forecasts = [];
        this.actuals = [];
        this.currentForecastYear = new Date().getFullYear();
        this.currentActualYear = new Date().getFullYear();
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
        } else {
            let nextMonth = this.currentActualMonth || 1;
            let nextYear = this.currentActualYear;
            nextMonth++;
            if (nextMonth > 12) {
                nextMonth = 1;
                nextYear++;
            }
            this.currentActualMonth = nextMonth;
            this.currentActualYear = nextYear;
        }
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
        this.renderForecastTimeline();
        this.renderActualTimeline();
    }

    renderForecastTimeline() {
        const container = document.getElementById('forecastTimeline');
        const yearDisplay = document.getElementById('forecastYearDisplay');
        if (!container) return;

        yearDisplay.textContent = this.currentForecastYear;

        const months = [];
        for (let i = 0; i < 12; i++) {
            const forecast = this.getForecastForMonth(this.currentForecastYear, i + 1);
            months.push({
                month: i + 1,
                name: this.monthNames[i],
                value: forecast ? forecast.forecast_units : null,
                id: forecast ? forecast.id : null
            });
        }

        container.innerHTML = months.map(m => `
            <div class="relative group">
                <button
                    type="button"
                    class="w-full aspect-square rounded-lg border-2 border-dashed border-border hover:border-green-400 transition-all duration-200 flex flex-col items-center justify-center gap-1 ${m.value ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-muted/30 hover:bg-muted/50'}"
                    onclick="window.forecastManager.editForecastValue(${m.month})"
                    data-month="${m.month}"
                >
                    <span class="text-xs font-medium text-muted-foreground">${m.name}</span>
                    ${m.value ? `<span class="text-sm font-semibold text-green-600">${m.value.toLocaleString()}</span>` : '<span class="text-xs text-muted-foreground/50">+ Add</span>'}
                </button>
                ${m.value ? `
                    <button
                        type="button"
                        class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onclick="event.stopPropagation(); window.forecastManager.removeForecast('${m.id}')"
                    >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    renderActualTimeline() {
        const container = document.getElementById('actualTimeline');
        const yearDisplay = document.getElementById('actualYearDisplay');
        if (!container) return;

        yearDisplay.textContent = this.currentActualYear;

        const months = [];
        for (let i = 0; i < 12; i++) {
            const actual = this.getActualForMonth(this.currentActualYear, i + 1);
            months.push({
                month: i + 1,
                name: this.monthNames[i],
                value: actual ? actual.actual_units : null,
                id: actual ? actual.id : null
            });
        }

        container.innerHTML = months.map(m => `
            <div class="relative group">
                <button
                    type="button"
                    class="w-full aspect-square rounded-lg border-2 border-dashed border-border hover:border-blue-400 transition-all duration-200 flex flex-col items-center justify-center gap-1 ${m.value ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-muted/30 hover:bg-muted/50'}"
                    onclick="window.forecastManager.editActualValue(${m.month})"
                    data-month="${m.month}"
                >
                    <span class="text-xs font-medium text-muted-foreground">${m.name}</span>
                    ${m.value ? `<span class="text-sm font-semibold text-blue-600">${m.value.toLocaleString()}</span>` : '<span class="text-xs text-muted-foreground/50">+ Add</span>'}
                </button>
                ${m.value ? `
                    <button
                        type="button"
                        class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onclick="event.stopPropagation(); window.forecastManager.removeActual('${m.id}')"
                    >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    editForecastValue(month) {
        const forecast = this.getForecastForMonth(this.currentForecastYear, month);
        const currentValue = forecast ? forecast.forecast_units : 0;

        const value = prompt(`Enter forecast units for ${this.monthNames[month - 1]} ${this.currentForecastYear}:`, currentValue);

        if (value !== null) {
            const numValue = parseInt(value);
            if (isNaN(numValue) || numValue < 0) {
                alert('Please enter a valid positive number');
                return;
            }

            if (forecast) {
                forecast.forecast_units = numValue;
            } else {
                this.addForecast(this.currentForecastYear, month, numValue);
            }
        }
    }

    editActualValue(month) {
        const actual = this.getActualForMonth(this.currentActualYear, month);
        const currentValue = actual ? actual.actual_units : 0;

        const value = prompt(`Enter actual units for ${this.monthNames[month - 1]} ${this.currentActualYear}:`, currentValue);

        if (value !== null) {
            const numValue = parseInt(value);
            if (isNaN(numValue) || numValue < 0) {
                alert('Please enter a valid positive number');
                return;
            }

            if (actual) {
                actual.actual_units = numValue;
            } else {
                this.addActual(this.currentActualYear, month, numValue);
            }
        }
    }

    clearAllForecasts() {
        if (confirm('Are you sure you want to remove all forecasts?')) {
            this.forecasts = [];
            this.renderTimelines();
        }
    }

    clearAllActuals() {
        if (confirm('Are you sure you want to remove all actuals?')) {
            this.actuals = [];
            this.renderTimelines();
        }
    }

    setupEventHandlers() {
        // Forecast year navigation
        const forecastPrevYear = document.getElementById('forecastPrevYear');
        if (forecastPrevYear) {
            forecastPrevYear.addEventListener('click', () => {
                this.currentForecastYear--;
                this.renderForecastTimeline();
            });
        }

        const forecastNextYear = document.getElementById('forecastNextYear');
        if (forecastNextYear) {
            forecastNextYear.addEventListener('click', () => {
                this.currentForecastYear++;
                this.renderForecastTimeline();
            });
        }

        const clearAllForecasts = document.getElementById('clearAllForecasts');
        if (clearAllForecasts) {
            clearAllForecasts.addEventListener('click', () => this.clearAllForecasts());
        }

        // Actual year navigation
        const actualPrevYear = document.getElementById('actualPrevYear');
        if (actualPrevYear) {
            actualPrevYear.addEventListener('click', () => {
                this.currentActualYear--;
                this.renderActualTimeline();
            });
        }

        const actualNextYear = document.getElementById('actualNextYear');
        if (actualNextYear) {
            actualNextYear.addEventListener('click', () => {
                this.currentActualYear++;
                this.renderActualTimeline();
            });
        }

        const clearAllActuals = document.getElementById('clearAllActuals');
        if (clearAllActuals) {
            clearAllActuals.addEventListener('click', () => this.clearAllActuals());
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

        this.currentForecastYear = latestForecastYear;
        this.currentActualYear = latestActualYear;

        this.renderTimelines();
    }
}
