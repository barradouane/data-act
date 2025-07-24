const selfsigned = require("selfsigned");
const fs = require("fs");
const path = require("path");

const attrs = [{ name: "commonName", value: "localhost" }];
const pems = selfsigned.generate(attrs, { days: 365 });

const certDir = path.join(__dirname, "certs");

if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

fs.writeFileSync(path.join(certDir, "cert.pem"), pems.cert);
fs.writeFileSync(path.join(certDir, "key.pem"), pems.private);

console.log(" Certificat generated in ./certs/");