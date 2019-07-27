"use strict";

require("dotenv").config();

const axios = require("axios");
const moment = require("moment");

class MyRenaultApi {
  constructor(gigyaApi, countryCode = "GB") {
    this.gigyaApi = gigyaApi;
    this.countryCode = countryCode;
  }

  async refreshGigyaJWTToken() {
    const jwtToken = await this.gigyaApi.fetchJWTToken();
    this.setGigyaJWT(jwtToken);

    return jwtToken;
  }

  async refreshKamereonToken(accountId) {
    const myAccount = this.selectAccount(accountId);
    const { accessToken: kamereonToken } = await myAccount.fetchKamereonToken();
    this.setKamereonToken(kamereonToken);

    return kamereonToken;
  }

  async refreshTokens(accountId) {
    const jwtToken = await this.refreshGigyaJWTToken();
    const kamereonToken = await this.refreshKamereonToken(accountId);

    return { jwtToken, kamereonToken };
  }

  setGigyaJWT(gigyaJWTToken) {
    this.gigyaJWTToken = gigyaJWTToken;
  }

  setKamereonToken(kamereonToken) {
    this.kamereonToken = kamereonToken;
  }

  async call(endpoint, params) {
    const doCall = async () => {
      const headers = {
        apikey: process.env.MY_RENAULT_API_KEY,
        "x-gigya-id_token": this.gigyaJWTToken
      };

      if (this.kamereonToken) {
        headers["x-kamereon-authorization"] = `Bearer ${this.kamereonToken}`;
      }

      if (params) {
        return await axios.post(
          `${process.env.MY_RENAULT_ROOT}/${endpoint}`,
          params,
          {
            headers
          }
        );
      } else {
        return await axios.get(`${process.env.MY_RENAULT_ROOT}/${endpoint}`, {
          headers
        });
      }
    };

    const response = await doCall();

    if (response.data.errorDetails) {
      throw Error(response.data.errorDetails);
    }

    return response.data;
  }

  async fetchPerson() {
    const personId = await this.gigyaApi.fetchPersonId();
    return await this.call(`persons/${personId}?country=${this.countryCode}`);
  }

  selectAccount(accountId) {
    const rootCall = `accounts/${accountId}`;

    return {
      fetchKamereonToken: async () =>
        await this.call(
          `${rootCall}/kamereon/token?country=${this.countryCode}`
        ),
      fetchVehicles: async () =>
        await this.call(`${rootCall}/vehicles?country=${this.countryCode}`)
    };
  }

  selectCar(vin) {
    const rootCall = `accounts/kmr/remote-services/car-adapter/v1/cars/${vin}`;

    return {
      fetchBatteryStatus: async () =>
        await this.call(`${rootCall}/battery-status`),
      fetchHVACStatus: async () => await this.call(`${rootCall}/hvac-status`),
      fetchCharges: async () =>
        await this.call(
          `${rootCall}/charges?start=20160101&end=${moment().format(
            "YYYYMMDD"
          )}`
        ),
      fetchDailyChargeHistory: async () =>
        await this.call(
          `${rootCall}/charge-history?type=day&start=20160101&end=${moment().format(
            "YYYYMMDD"
          )}`
        ),
      fetchMonthlyChargeHistory: async () =>
        await this.call(
          `${rootCall}/charge-history?type=month&start=201601&end=${moment().format(
            "YYYYMM"
          )}`
        ),
      fetchHVACSessions: async () =>
        await this.call(
          `${rootCall}/hvac-sessions?start=20160101&end=${moment().format(
            "YYYYMMDD"
          )}`
        ),
      fetchDailyHVACHistory: async () =>
        await this.call(
          `${rootCall}/hvac-history?type=day&start=20160101&end=${moment().format(
            "YYYYMMDD"
          )}`
        ),
      fetchMonthlyHVACHistory: async () =>
        await this.call(
          `${rootCall}/hvac-history?type=month&start=201601&end=${moment().format(
            "YYYYMM"
          )}`
        ),
      fetchCockpit: async () => await this.call(`${rootCall}/cockpit`),
      startPreconditioning: async targetTemperature =>
        await this.call(`${rootCall}/actions/hvac-start`, {
          action: "start",
          targetTemperature
        }),
      stopPreconditioning: async targetTemperature =>
        await this.call(`${rootCall}/actions/hvac-start`, {
          action: "stop"
        })
    };
  }
}

module.exports = MyRenaultApi;
