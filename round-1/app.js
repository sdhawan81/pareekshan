let signal = "GGGGGORRRRR";
let road = [], carPosition, buffer, result;

function trafficLights(roadState, n) {
    road = roadState;
    carPosition = road.indexOf('C');
    buffer = road.split("").map(state => signal.indexOf(state));
    result = road.split();
    let i = 0;
    while (i < n) {
        buffer = buffer.map(val => val < 0 ? val : (val + 1) % 11);
        updateCarPosition();
        let modifiedState = modifySignalState();
        result.push(modifiedState.join(""));
        i++;
    }

    return result;
}
function updateCarPosition() {
    if (carPosition >= road.length - 1 || buffer[carPosition + 1] < 5)
        carPosition++;
}
function modifySignalState() {
    let modifiedState = new Array(road.length).fill("");
    modifiedState = modifiedState.map((val, idx) => {
        if (idx === carPosition)
            return 'C';
        else if (buffer[idx] >= 0)
            return signal[buffer[idx]];
        return '.';
    });

    return modifiedState;
}
console.log(trafficLights("C...R............G......", 10));
