function where(data, options) {
    var keys = Object.keys(options);
    return data.filter((statistics) =>{
      return keys.every((key)=> {
        if (!options[keys].length) {
          return true; 
        }
        return options[key].includes(statistics[key]);
     });
 });
};

function findBy(data,options) {
    return where(data,options)[0];

}

async function getData() 
{
  let response = await fetch("https://raw.githubusercontent.com/sdhawan81/pareekshan/develop/round-2/files/startup-funding.json");
  let data = await response.json();
  return data;
}
let data=[];
var filter1 = {
    "company_name": ["LifeLock"]
}
filter2 = { "company_name": ["MyCityFaces"] }, { "city": ["Scottsdale"] };
getData().then(appData=>{
    data=appData;
    console.log(where(data,filter1));
    console.log(findBy(data,filter2));
});
