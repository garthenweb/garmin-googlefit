# Garmin Googlefit

The script will export the weight from the garmin web interface and inserts it as a dataset into the google fit api.

## Startup

Create a `credentials.json` with the following properties in the root of the project:

* garmin_username
* garmin_password
* google_client_id
* google_client_secret
* garmin_uid

Install dependencies via `npm install`.

Execute `npm start` in the project root. Follow the instructions to insert the current weight into your google fit account.
