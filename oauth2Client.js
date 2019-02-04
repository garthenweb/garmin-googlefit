import google from 'googleapis';
import credentials from './credentials.json'; 
const OAuth2 = google.auth.OAuth2;

export default new OAuth2(
  credentials.google_client_id,
  credentials.google_client_secret,
  'http://localhost:8080',
);
