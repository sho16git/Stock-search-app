import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
yahooFinance._notices.suppress(["yahooSurvey", "ripHistorical"]);

export default yahooFinance;
