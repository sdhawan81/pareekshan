using System;
using System.Collections.Generic;
using System.Text;

namespace ConsoleApp1
{
    class Program
    {
        static void Main(string[] args)
        {
            
        }
        public static string[] TrafficLights(string road, int n)
        {
            string[] states = new string[n+1];
            states[0] = road;
            int roadPoint = 0;
            int roadLength = road.Length;
            for(int timeUnit = 1; timeUnit <= n; timeUnit++)
            {
                string previousRoadState = states[timeUnit - 1];
                string currentRoadState = previousRoadState;
                //string currentRoadState = UpdateLights;
                if (currentRoadState[roadPoint + 1] == '.')
                {
                    currentRoadState = MoveAhead(states, currentRoadState, roadPoint);
                }
            }
        }
        public static string MoveAhead(string previousState, string roadState, int roadPoint)
        {
            StringBuilder tempState = new StringBuilder(roadState);
            tempState[roadPoint + 1] = 'C';
            
        }
        public static string UpdateLights(string[] allStates, int timeUnit)
        {
            Dictionary<int, int> lightStates = new Dictionary<int, int>();
            StringBuilder tempState = new StringBuilder(allStates[timeUnit]);
            for (int i = 0; i< allStates[timeUnit].Length; i++)
            {
                if (allStates[timeUnit] != "." && allStates[timeUnit] != "C")
                    lightStates.Add(i, 0);
            }
            foreach(var key in lightStates.Keys)
            {
                for(int i = timeUnit - 1; i >= 0; i--)
                {
                    lightStates[key] = lightStates[key] + 1;
                    if(allStates[timeUnit] == "R" && lightStates[key] == 5)
                        // Replace current light with updated light
                }
            }

        }
    }
}
