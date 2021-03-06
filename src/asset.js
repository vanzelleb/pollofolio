import store from "./store.js";

export default class Asset {
  constructor(item) {
    item = item ? item : {};
    this.id = item._id;
    this.currency = item._currency;
    this.name = item._name;
    this.ticker = item._ticker;
    this.amount = item._amount;
    this.buyValue = item._totalBuy;
    this.sellValue = item._totalSell;
    this.dateBuy = item._dateBuy;
    this.dateSell = item._dateSell;
    this.timeseries = item._timeseries;
    this.payouts = item._payouts;
    this.buyPrice = item._buyPrice;
    this.targetPrice = item._targetPrice;
    this.yearlyHigh = item._yearlyHigh;
    this.yearlyLow = item._yearlyLow;

    // values that don't need setters/getters
    this.peRatio = item.peRatio;
    this.address = item.address;
    this.industry = item.industry;
    this.description = item.description;
    this.lastChecked = item.lastChecked;
    this.error = item.error;
    this.news = [];
    this.signal = item.signal;
  }

  get id() {
    return this._id;
  }

  set id(val) {
    if (!val) this._id = null;
    else this._id = val;
  }

  get currency() {
    return this._currency;
  }

  set currency(val) {
    this._currency = val ? val : null;
  }

  get highPrice() {
    let max = Math.max(...Object.values(this._timeseries));
    return max ? max : 0;
  }

  get dateBuy() {
    if (this._dateBuy) return this._dateBuy.toISOString().substring(0, 10);
    else return null;
  }

  set dateBuy(date) {
    if (date) {
      this._dateBuy = new Date(date);
    } else this._dateBuy = null;
  }

  set yearlyHigh(val) {
    this._yearlyHigh = val ? parseFloat(val) : null;
  }

  get yearlyHigh() {
    return this._yearlyHigh ? this._yearlyHigh : null;
  }

  set yearlyLow(val) {
    this._yearlyLow = val ? parseFloat(val) : null;
  }

  get yearlyLow() {
    return this._yearlyLow ? this._yearlyLow : null;
  }

  set targetPrice(val) {
    this._targetPrice = val ? parseFloat(val) : null;
  }

  get targetPrice() {
    return this._targetPrice ? this._targetPrice : null;
  }

  get lastPrice() {
    return this.prices.length > 0 ? this.prices[this.prices.length - 1] : null;
  }

  set lastPrice(val) {
    if (this.lastChecked && val && !this.isSold())
      this._timeseries[this.lastChecked] = parseFloat(val);
    //this._lastPrice = val ? parseFloat(val) : null;
  }

  get dateSell() {
    if (this._dateSell) return this._dateSell.toISOString().substring(0, 10);
    else return "";
  }

  set dateSell(date) {
    if (date) this._dateSell = new Date(date);
    else this._dateSell = null;
  }

  get name() {
    return this._name;
  }

  set name(name) {
    if (name) this._name = name.toString();
    else this._name = "";
  }

  get ticker() {
    return this._ticker;
  }

  set ticker(val) {
    if (val) this._ticker = val.toString().toUpperCase();
    else this._ticker = "";
  }

  get timeseries() {
    return this._timeseries;
  }

  set timeseries(val) {
    this._timeseries = {};
    if (val) {
      let dates = Object.keys(val);
      dates.sort();
      for (let date of dates) this._timeseries[date] = val[date];
      // manually set the last available info
      if (this.lastChecked && this.lastPrice && !this.isSold())
        this._timeseries[this.lastChecked] = this.lastPrice;
    }
  }

  get prices() {
    return Object.values(this._timeseries);
  }

  get dates() {
    return Object.keys(this._timeseries);
  }

  get lastChange() {
    if (this.dates.length > 1) return this.lastChangePct * this.buyValue;
    return null;
  }

  get invested() {
    if (!this.isSold()) return this.buyValue;
    return null;
  }

  get return() {
    let sanitizedIncome = this.income ? this.income : 0;
    if (this.isSold())
      this._return = this.sellValue - this.buyValue + sanitizedIncome;
    else this._return = sanitizedIncome;
    return this._return;
  }

  get diffToYearlyHigh() {
    if (!this.isSold() && this.yearlyHigh && this.lastPrice)
      return (this.yearlyHigh / this.lastPrice) * this.value - this.value;
    return null;
  }

  get diffToTargetPrice() {
    if (!this.isSold() && this.targetPrice && this.lastPrice)
      return (this.targetPrice / this.lastPrice) * this.value - this.value;
    return null;
  }

  get lastChangePct() {
    if (!this.isSold() && this.dates.length > 1)
      return (
        this.lastPrice / this._timeseries[this.dates[this.dates.length - 2]] - 1
      );
    return null;
  }

  get changePct() {
    if (!this.isSold()) return (this.change / this.buyValue) * 100;
    return null;
  }

  get buyValue() {
    return this._totalBuy;
  }

  set buyValue(val) {
    this._totalBuy = val ? parseFloat(val) : "";
  }

  get sellValue() {
    return this._totalSell;
  }

  set sellValue(val) {
    this._totalSell = val ? parseFloat(val) : "";
  }

  get amount() {
    return this._amount;
  }

  set amount(val) {
    this._amount = val ? parseFloat(val) : "";
  }

  get value() {
    if (!this.isSold() && this.lastPrice)
      return (
        (this.lastPrice / this.buyPrice) * this.buyValue + this.forexChange
      );
    return null;
  }

  set buyPrice(val) {
    this._buyPrice = val ? parseFloat(val) : null;
  }

  get buyPrice() {
    return this._buyPrice;
  }

  get stopLoss() {
    const baseline = this.timeseries[store.state.settings.stopLoss.date];
    if (baseline && store.state.settings.stopLoss.pct > 0)
      return baseline - (baseline / 100) * store.state.settings.stopLoss.pct;
    return null;
  }

  get payouts() {
    if (!this._payouts) return {};
    return Object.entries(this._payouts);
  }

  set payouts(val) {
    this._payouts = {};
    // for backwards compatibility
    if (Array.isArray(val))
      for (let payout of val)
        this._payouts[payout.year] = { value: payout.value };
    else if (val) this._payouts = val;
  }

  get roi() {
    // calculate the annualized return on investment
    if (this.holdingPeriod > 365) {
      return (
        (Math.pow(
          1 + this.return / this.buyValue,
          1 / (this.holdingPeriod / 365)
        ) -
          1) *
        100
      );
    }
    // any investment that does not have a track record of at least 365 days cannot "ratchet up" its performance to be annualized
    // https://www.investopedia.com/terms/a/annualized-total-return.asp
    else return (this.return / this.buyValue) * 100;
  }

  get relativeChange() {
    // calculate annulaized relative return/alpha in comparison to the benchmark
    const hasData =
      this.dates.length > 0 &&
      store.state.settings.benchmark.hasOwnProperty("_timeseries");
    if (!this.isSold() && hasData) {
      let startPrice = store.state.settings.benchmark._timeseries[this.dateBuy];
      // by default assume the asset is active, therefore use the last available benchmark price
      let benchmarkPrices = Object.values(
        store.state.settings.benchmark._timeseries
      );
      let endPrice = benchmarkPrices[benchmarkPrices.length - 1];
      if (this.dateSell)
        endPrice = store.state.settings.benchmark._timeseries[this.dateSell];

      if (startPrice && endPrice)
        return this.changePct - ((endPrice - startPrice) / startPrice) * 100;
    }
    return null;
  }

  get missedGain() {
    if (this.lastPrice && this.highPrice)
      if (this.highPrice > this.lastPrice)
        return (this.highPrice / this.lastPrice) * this.value - this.value;
    return null;
  }

  get income() {
    let sum = 0;
    for (let date in this._payouts)
      sum += parseFloat(this._payouts[date].value);
    return sum;
  }

  get holdingPeriod() {
    if (!this._dateBuy) return null;
    return parseInt(
      ((this.isSold() ? this._dateSell : new Date()) - this._dateBuy) /
        (1000 * 60 * 60 * 24),
      10
    );
  }

  getYear() {
    if (this.isSold()) return this._dateSell.getFullYear();
    else return this._dateBuy.getFullYear();
  }

  isUpdated() {
    const today = new Date().toISOString().substring(0, 10);
    const hasNoTicker = !this.ticker;
    const hasNoPrice = !this.lastPrice && !this.isSold();
    const hasNoChart = this.dates.length === 0 && this.isSold();
    // flag to prevent repeated API calls per day for assets with unknown tickers
    const checkedToday = this.lastChecked === today;
    if (hasNoTicker || hasNoPrice || hasNoChart || !checkedToday) return false;
    return true;
  }

  isSold() {
    if (this._dateSell) return true;
    else return false;
  }

  hasAlarm() {
    return this.stopLoss > this.lastPrice;
  }

  get change() {
    if (this.isSold()) return null;
    if (this.lastPrice)
      return (this.lastPrice / this.buyPrice) * this.buyValue - this.buyValue;
    return null;
  }

  get forexChange() {
    // calculate exchange rate effects
    if (this.currency) {
      const base = store.state.settings.currency;
      const currencyRates = store.state.exchangeRates[base][this.currency];
      const today = new Date().toISOString().substring(0, 10);
      if (currencyRates) {
        let lastRate = currencyRates[today];
        let buyRate = currencyRates[this.dateBuy];
        let changeRatio = buyRate / lastRate;
        return (
          (this.lastPrice / this.buyPrice) * this.buyValue * changeRatio -
          (this.lastPrice / this.buyPrice) * this.buyValue
        );
      }
    }
    return null;
  }
}
