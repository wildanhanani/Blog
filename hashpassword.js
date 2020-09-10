const Bcrypt = require("bcrypt");
const passwordHash = Bcrypt.hashSync("exmple password", 10);
console.log(passwordHash);
const result = Bcrypt.compareSync("exmple password", passwordHash);
console.log(result);
