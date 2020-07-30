# Overview

Most of the time when we are working on a project, we will have to deal with the code which is written by someone else. If you are lucky, you will find a code which is well written or have some kind of documentation. But what if you have to deal with a code which has no documentation, and is very hard to understand? Trust me, we all have been there, and it’s not fun at all.

A good developer needs to know two things really well

1. Write a code which is easy to understand.
   Expert Tip: Adding tons of documentation and writing a very convoluted code is not going to help.
2. As a rule, always leave the code in better state than before you started working on it.

## Objective

This round will test both of your skills. Lot of time the problem statement you will get may be very ambiguous. So please do not assume, always ask questions. All the best!!!

We have two problem statements, and each of them should take around 30 min to finish. It is important that you understand that just completion of problem statement should not be your goal. Even if you do one problem statement, do it in the best way possible.

## Problem Statement 1

### Description

You have data set of funding raised by companies, and need an ability to query the data set to filter the data based on parameters passed in the query.

#### Task

You need to write code to write two functions “findBy”, and “where”. These two functions will take options as input where options will the parameters on which you want to filter the data. Difference between findBy and where is that findBy will return the first result matching the condition, and where will return all the records matching the condition.

Data could be filter based on following parameters

1. Company Name
2. City
3. State
4. Round (Founding Round)

[Companies Funding dataset](https://raw.githubusercontent.com/sdhawan81/pareekshan/develop/round-2/files/startup-funding.json)

\* Make sure the code is modular, and expandable.

## Problem Statement 2

### Description

You are provided with a javascript file which has is really bad, with lots of duplicated/copied and pasted code, improper use of method/classes, bad naming of variables and methods, etc. Your goal is to refactor this code.

### Instructions

You can create new classes, helper methods, etc as you see fit.
Feel free to split things into new files and folders as you like, but keeping everything in one file is fine too. You have 30 minutes to complete this exercise.

### Assets

The file that needs to be refactored is located at [Refactor-me](https://raw.githubusercontent.com/sdhawan81/pareekshan/develop/round-2/files/refactor-me.js).

### Test Data

#### Sample customer object

```javascript
let customer = {
  name: "martin",
  rentals: [
    { movieID: "F001", days: 3 },
    { movieID: "F002", days: 1 },
  ],
};
```

#### Output for above input

```
Rental Record for martin
	Ran	3.5
	Trois Couleurs: Bleu	2
Amount owed is 5.5
You earned 2 frequent renter points
```

\* Please ignore the green color font in above output.

### Tip

You are not expected to have enough time to make all of the changes you would like. Part of the exercise is the time constraint: you have to prioritize what you think will be the most beneficial refactor, and weigh it with how much time it will take you.

## Submission

Submit your code inside solution folder.
