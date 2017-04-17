import phantom from 'phantom';
import credentials from './credentials.json';

const loginAddress = 'https://sso.garmin.com/sso/login?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=olaxpw-conctmodern010&source=https%3A%2F%2Fconnect.garmin.com%2Fde-DE%2Fsignin&redirectAfterAccountLoginUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&redirectAfterAccountCreationUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=de_DE&id=gauth-widget&cssUrl=https%3A%2F%2Fstatic.garmincdn.com%2Fcom.garmin.connect%2Fui%2Fcss%2Fgauth-custom-v1.2-min.css&clientId=GarminConnect&rememberMeShown=true&rememberMeChecked=false&createAccountShown=true&openCreateAccount=false&usernameShown=false&displayNameShown=true&consumeServiceTicket=false&initialFocus=true&embedWidget=false&generateExtraServiceTicket=false&globalOptInShown=false&globalOptInChecked=false';
const successAddress = 'https://connect.garmin.com/modern/';

const waitForEvaluated = (page) => (fn, checker) => new Promise((resolve) => {
  const id = setInterval(async () => {
    let res = await page.evaluate(fn);
    if (checker(res)) {
      clearInterval(id);
      resolve(res);
    }
  }, 1000);
});

export default async () => {
  const instance = await phantom.create();
  const page = await instance.createPage();
  const status = await page.open(loginAddress);

  if (status !== 'success') {
    instance.exit();
    throw new Error('FAIL to load the address');
  }

  await page.evaluate((username, password) => {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    document.getElementById('login-form').submit();
  }, credentials.garmin_username, credentials.garmin_password);

  await waitForEvaluated(page)(() => location.href, (res) => res === successAddress);
  await page.evaluate(() => location.href = 'https://connect.garmin.com/modern/weight/weekly/0');
  const weight = await waitForEvaluated(page)(() => {
    const dateEl = document.getElementById('localDateTimeClickedTableRow');
    const weightEl = document.getElementById('directWeightClickedTableRow');
    if (!weightEl) {
      return false;
    }
    const weightUnitEl = weightEl.parentNode.getElementsByClassName('js-weight-unit')[0];
    return {
      value: weightEl.innerText,
      unit: weightUnitEl.innerText,
      date: dateEl.innerText,
    };
  }, Boolean);

  instance.exit(1);
  return {
    value: parseFloat(weight.value.replace(',', '.'), 10),
    unit: weight.unit,
    date: new Date(weight.date),
  };
};