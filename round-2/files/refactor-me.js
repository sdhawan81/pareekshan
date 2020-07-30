var Rental = require('./Rental.js');
let printCustomerStatement = function(statementObject){
  let resultString = `Rental Record for ${statementObject.name}\n`;
  statementObject.rentedMovies.forEach(movie => {
    resultString += `\t${movie.title}\t${movie.amount}\n`;
  });
  resultString += `Amount owed is ${statementObject.totalAmount}\nYou earned ${statementObject.frequentRenterPoints} frequent renter points`;
  return resultString;
}

let customer = {
  name: "martin",
  rentals: [
    { movieID: "F001", days: 3 },
    { movieID: "F002", days: 1 },
  ],
};

console.log(printCustomerStatement(new Rental().getCustomerStatement(customer)));