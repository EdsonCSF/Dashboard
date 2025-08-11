const fs = require("fs");
const path = require("path");

exports.handler = async () => {
  try {
    const pasta = path.join(__dirname, "../../");
    const arquivos = fs.readdirSync(pasta)
      .filter(f => f.endsWith(".html") && f !== "index.html");

    return {
      statusCode: 200,
      body: JSON.stringify(arquivos)
    };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
