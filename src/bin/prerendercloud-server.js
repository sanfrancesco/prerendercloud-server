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

const server = require("../index.js");
server.start(parsedOptions, function (err, address) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  console.log(
    `Prerender.cloud pushstate server started: http://${address.address}:${address.port}`
  );
  console.log(
    "NOTE: if running from your laptop on localhost or 127.0.0.1 or 0.0.0.0 you'll need a public IP so service.prerender.cloud to access your server"
  );
  console.log(
    "To get a public IP for your machine use a service like ngrok.com (then run: ngrok http 9000) or if you have a VPS, an SSH reverse tunnel (something like: ssh user@www.myremotehost.com -R 9000:localhost:9000)"
  );
});
