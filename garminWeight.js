import puppeteer from "puppeteer";
import credentials from "./credentials.json";

const loginAddress =
  "https://sso.garmin.com/sso/signin?service=https%253A%252F%252Fconnect.garmin.com%252Fmodern%252F&webhost=https%253A%252F%252Fconnect.garmin.com%252Fmodern%252F&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin%2F&redirectAfterAccountLoginUrl=https%253A%252F%252Fconnect.garmin.com%252Fmodern%252F&redirectAfterAccountCreationUrl=https%253A%252F%252Fconnect.garmin.com%252Fmodern%252F&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&cssUrl=https%3A%2F%2Fstatic.garmincdn.com%2Fcom.garmin.connect%2Fui%2Fcss%2Fgauth-custom-v1.2-min.css&privacyStatementUrl=https%3A%2F%2Fwww.garmin.com%2Fen-US%2Fprivacy%2Fconnect%2F&clientId=GarminConnect&rememberMeShown=true&rememberMeChecked=false&createAccountShown=true&openCreateAccount=false&displayNameShown=false&consumeServiceTicket=false&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true&generateTwoExtraServiceTickets=false&generateNoServiceTicket=false&globalOptInShown=true&globalOptInChecked=false&mobile=false&connectLegalTerms=true&showTermsOfUse=false&showPrivacyPolicy=false&showConnectLegalAge=false&locationPromptShown=true&showPassword=true";
const successAddress = "https://connect.garmin.com/modern/";

const waitForEvaluated = page => (fn, checker, timeout = 10000) => {
  let remainingTimeout = timeout;
  const interval = 1000;
  return new Promise((resolve, reject) => {
    const id = setInterval(async () => {
      if (remainingTimeout <= 0) {
        reject(new Error(`Timed out after ${timeout} ms`));
        clearInterval(id);
        return;
      }
      try {
        let res = await page.evaluate(fn);
        if (checker(res)) {
          clearInterval(id);
          resolve(res);
        }
      } catch (e) {
      } finally {
        remainingTimeout -= interval;
      }
    }, interval);
  });
};

export default async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.goto(loginAddress, { waitUntil: "networkidle2" });
  await page.evaluate(
    (username, password) => {
      document.getElementById("username").value = username;
      document.getElementById("password").value = password;
      document.getElementById("login-form").submit();
    },
    credentials.garmin_username,
    credentials.garmin_password
  );

  await waitForEvaluated(page)(
    () => location.href,
    res => res === successAddress
  );
  await page.goto(
    `https://connect.garmin.com/modern/proxy/userprofile-service/userprofile/personal-information/weightWithOutbound/filterByDay?from=${Date.now() -
      1000 * 60 * 60 * 24}&until=${Date.now()}`,
    { waitUntil: "networkidle2" }
  );
  const weight = await waitForEvaluated(page)(() => {
    try {
      const dataset = JSON.parse(document.body.children[0].innerHTML)[0];
      return {
        value: dataset.weight / 1000,
        unit: "kg",
        date: dataset.date
      };
    } catch (e) {
      return false;
    }
  }, Boolean);

  await browser.close();

  return {
    value: weight.value,
    unit: weight.unit,
    date: new Date(weight.date)
  };
};
