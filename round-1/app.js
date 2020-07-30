let states,c = 0,buffer = [],road;
// original signal
let signal = { R: 5, G: 5, O: 1 };
//signal chaned value
let signalChanged = { R: "G", G: "O", O: "R" };
// check for signal
function trafficLights(r, n) {
    states = [road];
    road=r;
    road = road.split("");
    road[0] = ".";
    road.map((val, idx) => {
        (val == "G" || val == "R" || val == 'O') ? buffer.push([val, 0, idx]) : "";
    });

    // move car
    for (let i = 1; i <= n; i++) {
        moveCar();
        //create final state
        finalState();
    }
    return states;
}
function moveCar(){
    buffer.map((val) => {
        val[1] += 1;
        if (signal[val[0] == val[1]]) {
            val[0] = signalChanged[val[0]];
            val[1] = 0;
        }
    });
    if (road[c + 1] == "." || c + 1 >= road.length) {
        c++;
    }
    else {
        buffer.map(val => {
            if (c + 1 == val[2] && val[0] == "G")
                car++;
        });
    }
}
function finalState(){
    buffer.map((val) => road[val[2]] = val[0]);

        if (c >= 0 && c < road.length) {
            //value swap temporarily
            let temp = road[c];
            road[c] = "C";
            states.push(road.join(""));// insert state value
            road[c] = temp;

        }
        else
            states.push(road.join(""));
}
console.log(trafficLights("C...R............G......", 10));




