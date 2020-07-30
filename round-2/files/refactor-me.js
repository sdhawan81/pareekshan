var Rental  = require('./Rental.js');
let customer = {
  name: "martin",
  rentals: [
    { movieID: "F001", days: 3 },
    { movieID: "F002", days: 1 },
  ],
};
console.log(new Rental().getCustomerStatement(customer));