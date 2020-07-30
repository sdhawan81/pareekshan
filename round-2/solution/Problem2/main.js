const { Rental,Customer, logStatements } = require("./data.js");

let customer = new Customer("Martin", [
  { movieID: "F001", days: 3 },
  { movieID: "F002", days: 1 }
]);

customerRental=new Rental().getCustomerStatement(customer);
console.log(logStatements(customerRental));