//constructor to create Customer
function Customer(name, rentals) {
    this.name = name;
    this.rentals = rentals;
};

//function to generate statements
function logStatements(customerRental) {
    let statement = `Rental Record for ${customerRental.name}\n`;
    customerRental.rentedMovies.forEach(movie => {
        statement += `\t${movie.title}\t${movie.amount}\n`;
    });
    statement += `Amount owed is ${customerRental.totalAmount}\nYou earned ${customerRental.frequentRenterPoints} frequent renter points`;
    return statement;
}
//data for movies
const movies = {
    F001: { title: 'Ran', code: 'regular' },
    F002: { title: 'Trois Couleurs: Bleu', code: 'regular' },
    F003: { title: 'Cars 2', code: 'childrens' },
    F004: { title: 'Latest Hit Release', code: 'new' },
};
//Rental class
class Rental {
    getCustomerStatement(customer) {
        let result = {
            name: customer.name,
            rentedMovies: [],
            frequentRenterPoints: 0,
            totalAmount: 0
        };
        for (let r of customer.rentals) {
            let movie = movies[r.movieID];
            let currentMovieAmount = this.calculateAmount(movie, r.days);
            result.frequentRenterPoints += this.frequentRenterPoints(movie, r.days);
            result.rentedMovies.push({ title: movie.title, amount: currentMovieAmount });
            result.totalAmount += currentMovieAmount;
        }
        return result;
    }
    getAmount(days, val) {
        return (days > val) ? (days - val) * 1.5 : 0;
    }
    frequentRenterPoints(movie, days) {
        let frequentRenterPoints = 1;
        if (movie.code == "new" && days > 2)
            frequentRenterPoints++;
        return frequentRenterPoints;
    }
    calculateAmount(movie, days) {
        let thisAmount = 0;
        switch (movie.code) {
            case "regular": thisAmount = 2 + this.getAmount(days, 2);
                break;
            case "new": thisAmount = days * 3;
                break;
            case "childrens": thisAmount = 1.5 + this.getAmount(days, 3);
                break;
            default: break;
        }
        return thisAmount;
    }
};

module.exports = {Rental,Customer,logStatements};

