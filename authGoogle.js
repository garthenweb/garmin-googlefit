import open from 'open';
import oauth2Client from './oauth2Client';

const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// generate a url that asks permissions for Google+ and Google Calendar scopes
const scope = [
  'https://www.googleapis.com/auth/fitness.body.write',
];

export default function openAuth() {
  const url = oauth2Client.generateAuthUrl({ scope });
  open(url);
}
