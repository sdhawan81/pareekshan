class Rental{
    getCustomerStatement (customer) {

        var movies = {
          F001: { title: 'Ran', code: 'regular' },
          F002: { title: 'Trois Couleurs: Bleu', code: 'regular' },
          F003: { title: 'Cars 2', code: 'childrens' },
          F004: { title: 'Latest Hit Release', code: 'new' },
          //EXERCISE NOTE: add more movies if you need
        };
       
        let totalAmount = 0;
        let frequentRenterPoints = 0;
        let result = `Rental Record for ${customer.name}\n`;
        for (let r of customer.rentals) {
          let movie = movies[r.movieID];
          let currentMovieAmount = this.getAmountForAMovie(movie, r.days);
       
          frequentRenterPoints++;
          if (movie.code === 'new' && r.days > 2) frequentRenterPoints++;
       
          result += `\t${movie.title}\t${currentMovieAmount}\n`;
          totalAmount += currentMovieAmount;
        }
        result += `Amount owed is ${totalAmount}\nYou earned ${frequentRenterPoints} frequent renter points`;
       
        return result;
       }
       getAmountForAMovie (movie, days) {
        let thisAmount = 0;
        switch (movie.code) {
          case 'regular':
            thisAmount = 2;
            if (days > 2) {
              thisAmount += (days - 2) * 1.5;
            }
            break;
          case 'new':
            thisAmount = days * 3;
            break;
          case 'childrens':
            thisAmount = 1.5;
            if (days > 3) {
              thisAmount += (days - 3) * 1.5;
            }
            break;
          default:
            break;
        }
        return thisAmount;
       }
};

module.exports = Rental;