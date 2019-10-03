import puppeteer from "puppeteer";
import credentials from "./credentials.json";

const loginAddress =
  "https://sso.garmin.com/sso/login?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=olaxpw-conctmodern010&source=https%3A%2F%2Fconnect.garmin.com%2Fde-DE%2Fsignin&redirectAfterAccountLoginUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&redirectAfterAccountCreationUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=de_DE&id=gauth-widget&cssUrl=https%3A%2F%2Fstatic.garmincdn.com%2Fcom.garmin.connect%2Fui%2Fcss%2Fgauth-custom-v1.2-min.css&clientId=GarminConnect&rememberMeShown=true&rememberMeChecked=false&createAccountShown=true&openCreateAccount=false&usernameShown=false&displayNameShown=true&consumeServiceTicket=false&initialFocus=true&embedWidget=false&generateExtraServiceTicket=false&globalOptInShown=false&globalOptInChecked=false";
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
  await page.evaluate(
    (from, to) =>
      (location.href =
        "https://connect.garmin.com/modern/proxy/userprofile-service/userprofile/personal-information/weightWithOutbound/filterByDay?from=" +
        from +
        "&until=" +
        to),
    Date.now() - 1000 * 60 * 60 * 24,
    Date.now()
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
