import { clients } from "../../private/clients.js";

export class App {
  modules = {};

  constructor(config) {
    this.config = config;
    this.definitions = { methods: {} };
    this.initPromise = this.init();
  }

  async init() {
    try {
      await this.findClient();
      let modules = JSON.parse(
        (
          await this.client.request("http", "request", [
            "POST",
            this.config.url,
            JSON.stringify({
              info: true,
            }),
            "application/json",
          ])
        ).result.response
      ).modules.map((v) => v.name);

      for (let module of modules) {
        this.modules[module] = JSON.parse(
          (
            await this.client.request("http", "request", [
              "POST",
              this.config.url,
              JSON.stringify({
                info: true,
                module,
              }),
              "application/json",
            ])
          ).result.response
        ).exports;
      }

      for (let module in this.modules) {
        for (let exportName in this.modules[module]) {
          this.definitions.methods[module + exportName] = {
            name: exportName,
            arguments: this.config.argumentConfig[module]?.[exportName]
              ? this.config.argumentConfig[module][exportName]
              : [],
          };
          this[module + exportName] = async function () {
            return JSON.parse(
              (
                await this.client.request("http", "request", [
                  "POST",
                  this.config.url,
                  JSON.stringify({
                    module,
                    export: exportName,
                    arguments: [...arguments],
                  }),
                  "application/json",
                ])
              ).result.response
            ).data;
          };
        }
      }
    } catch {
      this.refreshCombine = true;
      console.log("Combine failed!");
    }
  }

  async updateDefinitions() {
    await this.init();
  }

  async findClient() {
    this.client = clients[this.config.client];
  }
}
