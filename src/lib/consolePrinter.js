module.exports = function consolePrinter(msg, indent = 0) {
  const splitMsg = msg.split("");

  let shortLinesMsg = "";

  shortLinesMsg += Array(indent).join(" ");

  for (let i = 0; i < splitMsg.length; i++) {
    if (i > 0 && i % 50 === 0) {
      if (splitMsg[i - 1] !== " " && splitMsg[i] !== " ") shortLinesMsg += "-";

      shortLinesMsg += `\n${Array(indent).join(" ")}`;
      if (splitMsg[i] !== " ") shortLinesMsg += splitMsg[i];
    } else {
      shortLinesMsg += splitMsg[i];
    }
  }

  console.log(shortLinesMsg);
};
