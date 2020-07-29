# Problem Statement

A character string represents a city road.

Cars travel on the road obeying the traffic lights.

#### Legend:

- . = Road
- C = Car
- G = GREEN traffic light
- O = ORANGE traffic light
- R = RED traffic light

Something like this:

C...R............G......

## Rules

### Simulation

At each iteration:

1. the lights change, according to the traffic light rules... then
2. the car moves, obeying the car rules

### Traffic Light Rules

Traffic lights change colour as follows:

- GREEN for 5 time units... then
- ORANGE for 1 time unit... then
- RED for 5 time units....
- ... and repeat the cycle

### Car Rules

- Cars travel left to right on the road, moving 1 character position per time unit
- Cars can move freely until they come to a traffic light. Then:

  - if the light is GREEN they can move forward (temporarily occupying the same cell as the light)
  - if the light is ORANGE then they must stop (if they have already entered the intersection they can continue through)
  - if the light is RED the car must stop until the light turns GREEN again

## Task

Given the initial state of the road, return the states for all iterations of the simulation.

### Input

- road = the road array
- n = how many time units to simulate (n >= 0)

### Output

- An array containing the road states at every iteration (including the initial state)
  - Note: If a car occupies the same position as a traffic light then show only the car

### Notes

- There is only one car
- For the initial road state
  - the car is always at the first character position
  - traffic lights are either GREEN or RED, and are at the beginning of their countdown cycles
- There are no reaction delays - when the lights change the car drivers will react immediately!
- If the car goes off the end of the road it just disappears from view
- There will always be some road between adjacent traffic lights

### Example

Run simulation for 10 time units

#### Sample Input

- road = "C...R............G......"
- n = 10

#### Expected Result

```javascript
[
  "C...R............G......", // 0 initial state as passed
  ".C..R............G......", // 1
  "..C.R............G......", // 2
  "...CR............G......", // 3
  "...CR............G......", // 4
  "....C............O......", // 5 show the car, not the light
  "....GC...........R......", // 6
  "....G.C..........R......", // 7
  "....G..C.........R......", // 8
  "....G...C........R......", // 9
  "....O....C.......R......", // 10
];
```
