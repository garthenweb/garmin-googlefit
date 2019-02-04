import google from "googleapis";
import { promisify } from "es6-promisify";

import oauth2Client from "./oauth2Client";
import requestFitAuth from "./authGoogle";
import getRecentWeight from "./garminWeight";
import storage from "./storage";
import credentials from "./credentials.json";

// monkey patch console log for logs with date
const originalLog = console.log;
global.console.log = (...args) =>
  originalLog(`[${new Date().toISOString()}]`, ...args);

const OAuth2 = google.auth.OAuth2;
const fitness = google.fitness("v1");
const dataSourceCreate = promisify(fitness.users.dataSources.create);
const dataSourceDatasetsPatch = promisify(
  fitness.users.dataSources.datasets.patch
);
const dataSourceDatasetsGet = promisify(fitness.users.dataSources.datasets.get);

google.options({ auth: oauth2Client });

(async () => {
  console.log("sync started...");
  let tokens = await storage.get("tokens");
  if (!tokens) {
    requestFitAuth();
    console.log(
      "Accept access and copy the code query parameter from the redirect url into the terminal and hit enter"
    );

    const splitter = require("split")();
    const stdInListener = process.stdin.pipe(splitter);
    tokens = await new Promise((resolve, reject) => {
      stdInListener.on("data", function setCredentials(code) {
        console.log(`receive code \`${code}\``);
        stdInListener.removeListener("data", setCredentials);
        process.stdin.unpipe(splitter);

        oauth2Client.getToken(code, async (err, tokens) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(tokens);
        });
      });
    });
    await storage.set("tokens", tokens);
  }

  oauth2Client.setCredentials(tokens);

  let dataStreamId = await storage.get("dataStreamId");
  // if data stream was not stored, create it
  if (!dataStreamId) {
    const dataSource = await dataSourceCreate({
      resource: dataSourceResource,
      userId: "me"
    });
    await storage.set("dataStreamId", dataSource.dataStreamId);
    dataStreamId = dataSource.dataStreamId;
  }

  const weight = await getRecentWeight();
  const dataSourceBody = createDataset(dataStreamId, weight);
  const datasetId = `${dataSourceBody.minStartTimeNs}-${
    dataSourceBody.maxEndTimeNs
  }`;
  const remoteDataSource = await dataSourceDatasetsGet({
    dataSourceId: dataStreamId,
    datasetId,
    limit: 1,
    userId: "me"
  });

  if (remoteDataSource.point.length >= 1) {
    console.log(
      `Duplicated entry found: ${weight.date}, ${weight.value} ${weight.unit}`
    );
  } else {
    await dataSourceDatasetsPatch({
      dataSourceId: dataStreamId,
      datasetId,
      resource: dataSourceBody,
      userId: "me"
    });
    console.log(
      `Successfully created dataset: ${weight.date}, ${weight.value} ${
        weight.unit
      }`
    );
  }
  console.log("sync ended!");
})();

const dataSourceResource = {
  application: { name: "Garmin Googlefit" },
  dataType: {
    field: [{ name: "weight", format: "floatPoint" }],
    name: "com.google.weight"
  },
  device: {
    manufacturer: "Garmin",
    model: "Index Smart Scale",
    type: "scale",
    uid: credentials.garmin_uid,
    version: "3.0.0.0"
  },
  type: "raw"
};

const createDataset = (dataStreamId, weight) => {
  const start = weight.date.getTime() * 1000 * 1000;
  const end = weight.date.getTime() * 1000 * 1000 + 110;
  return {
    dataSourceId: dataStreamId,
    minStartTimeNs: start,
    maxEndTimeNs: end,
    point: [
      {
        dataTypeName: "com.google.weight",
        startTimeNanos: start,
        endTimeNanos: end,
        value: [{ fpVal: weight.value }]
      }
    ]
  };
};
