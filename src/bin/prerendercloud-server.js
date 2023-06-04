#!/usr/bin/env node

const firstArg = process.argv[2];

if (["--version", "-v"].includes(firstArg)) {
  console.log(require("../../package.json").version);
  process.exit(0);
}

const optionsMap = require("../lib/options.js");
if (["--help", "-h"].includes(firstArg)) {
  const optionStr = Object.keys(optionsMap)
    .map((key) => `      ${key}`)
    .join("\n");

  console.log(
    "\n" +
      "  Usage: prerendercloud-server [options] [LocalPath or S3Uri]\n\n" +
      "    Environment variables: [PORT, PRERENDER_TOKEN]\n" +
      "    Options:\n" +
      optionStr +
      "\n" +
      "    Defaults:\n" +
      "      current directory, port 9000, no API token\n\n" +
      "  Examples:\n" +
      "    prerendercloud-server\n" +
      "    prerendercloud-server dist\n" +
      "    PORT=9000 prerendercloud-server --enable-middleware-cache dist\n" +
      "    PRERENDER_TOKEN=my-secret-token prerendercloud-server\n" +
      "    PRERENDER_TOKEN=my-secret-token prerendercloud-server s3://my-s3-bucket\n"
  );
  process.exit(0);
}

const allArgs = process.argv.slice().slice(2);
const parsedOptions = { directory: "." };

allArgs.forEach((arg) => {
  if (arg.match(/^--/)) {
    if (arg in optionsMap) {
      parsedOptions[arg] = true;
    } else {
      console.log("invalid option:", arg);
      process.exit(1);
    }
  } else {
    parsedOptions.directory = arg;
  }
});

const successColor = "\x1b[32m";
const resetColor = "\x1b[0m";

console.log(
  "\nStarting Headless-Render-API.com pushstate server for single-page apps"
);
console.log("rebranded from prerender.cloud in may 2022");

const server = require("../index.js");

server.start(parsedOptions, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(
    "\nWARNING: If using localhost or a private IP, follow the steps below for a public IP:\n"
  );

  console.log("  OPTION A: Use a service like ngrok.com");
  console.log("            e.g., Run \x1b[1mngrok http 9000\x1b[0m\n");

  console.log("  OPTION B: Use a VPS with an SSH reverse tunnel");
  console.log(
    "            e.g., Run \x1b[1mssh user@myremotehost.com -R 9000:localhost:9000\x1b[0m\n"
  );

  console.log("for more info:");
  console.log(" - https://headless-render-api.com");
  console.log(" - https://github.com/sanfrancesco/prerendercloud-server\n");

  console.log(
    `${successColor}Pushstate Server (SPA) started successfully on: http://${address.address}:${address.port}\n`
  );
  console.log("Enjoy!", resetColor);
});
