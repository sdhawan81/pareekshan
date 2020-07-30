
function findBy(options) {
    return where(options)[0];

}

function where(options) {
    let searchedData = [];
    for (i = 0; i < data.length; i++) {
        options.forEach(option => {

            for (let key of Object.keys(option)) {
                let presence = false,idx=-1;
                if (data[i].key == option.key) {
                    for (i = 0; i < searchedData.length; i++)
                        if (searchedData[i] == data[i]) presence = true;
                    if (!presence)
                        searchedData.push(data[i]);
                }

                else
                    if (searchedData[i] == data[i]) {idx=i;}
                if (idx!=-1) searchedData.splice(idx, 1);

            }
        });
    }
    return searchedData;

}

import {data} from "./data";

parameter = [{ "company_name": "MyCityFaces" }, { "city": "Scottsdale" }];
where(parameter);
findBy(parameter);