// tokenManager.ts
import https from 'https';
import querystring from 'querystring';
import logger from './utils/troxorlogger';
import { httpsRequest } from './utils';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

class TokenManager {
  private accessToken: string = '';
  private tokenExpiresAt: number = 0;

  async getAccessToken(): Promise<string> {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
    return this.accessToken;
  }

  private isTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiresAt;
  }

  private async refreshToken(): Promise<void> {
    const postData = querystring.stringify({
      grant_type: 'password',
      username: process.env.ZAPTEC_USERNAME as string,
      password: process.env.ZAPTEC_PASSWORD as string,
    });

    const options: https.RequestOptions = {
      method: 'POST',
      hostname: 'api.zaptec.com',
      path: '/oauth/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    logger.info('Refreshing token...');
    const data = await httpsRequest(options, postData);
    const jsonResponse: TokenResponse = JSON.parse(data);
    
    this.accessToken = jsonResponse.access_token;
    this.tokenExpiresAt = Date.now() + jsonResponse.expires_in * 1000;
    logger.info('Token refreshed successfully.');
  }
}

export const tokenManager = new TokenManager();
