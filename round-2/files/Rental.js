class Rental {
  constructor() {
    this.movies = {
      F001: { title: 'Ran', code: 'regular' },
      F002: { title: 'Trois Couleurs: Bleu', code: 'regular' },
      F003: { title: 'Cars 2', code: 'childrens' },
      F004: { title: 'Latest Hit Release', code: 'new' },
      //EXERCISE NOTE: add more movies if you need
    };
  }
  getCustomerStatement(customer) {
    let result = {
      name: customer.name,
      rentedMovies: [],
      frequentRenterPoints: 0,
      totalAmount: 0
    };
    for (let r of customer.rentals) {
      let movie = this.movies[r.movieID];
      let currentMovieAmount = this.getAmountForAMovie(movie, r.days);

      result.frequentRenterPoints += this.getFrequentRenterPoints(movie, r.days);
      
      result.rentedMovies.push({title: movie.title, amount: currentMovieAmount});
      result.totalAmount += currentMovieAmount;
    }
    return result;
  }
  calculateAmountOnDays(days, limit){
    return (days > limit) ? (days - limit) * 1.5 : 0;
  }
  getFrequentRenterPoints(movie, days){
    let frequentRenterPoints = 1;
    if(movie.code === 'new' && days > 2)
      frequentRenterPoints++;
    return frequentRenterPoints;
  }
  getAmountForAMovie(movie, days) {
    let thisAmount = 0;
    switch (movie.code) {
      case 'regular':
        thisAmount = 2 + this.calculateAmountOnDays(days, 2);
        break;
      case 'new':
        thisAmount = days * 3;
        break;
      case 'childrens':
        thisAmount = 1.5 + this.calculateAmountOnDays(days, 3);
        break;
      default:
        break;
    }
    return thisAmount;
  }
};

module.exports = Rental;