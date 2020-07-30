using System;
using System.Collections.Generic;
using System.Text;

namespace ConsoleApp1
{
    class Program
    {
        static void Main(string[] args)
        {
            string[] result = TrafficLights("C...R............G......", 10);
            PrintArray(result);
        }
        public static void PrintArray(string[] array)
        {
            foreach (string item in array)
                Console.WriteLine(item);
        }
        public static string[] TrafficLights(string road, int n)
        {
            string[] states = new string[n+1];
            states[0] = road;
            //int roadPoint = 0;
            //int roadLength = road.Length;
            for(int timeUnit = 1; timeUnit <= n; timeUnit++)
            {
                string previousRoadState = states[timeUnit - 1];
                states[timeUnit] = previousRoadState;
                string currentRoadState = UpdateLights(states, timeUnit);
                //if (currentRoadState[roadPoint + 1] == '.')
                //{
                //    currentRoadState = MoveAhead(states, currentRoadState, roadPoint);
                //}
                states[timeUnit] = currentRoadState;
            }
            return states;
        }
        public static string MoveAhead(string previousState, string roadState, int roadPoint)
        {
            StringBuilder tempState = new StringBuilder(roadState);
            tempState[roadPoint + 1] = 'C';


            return tempState.ToString();
        }
        public static string UpdateLights(string[] allStates, int timeUnit)
        {
            Dictionary<int, int> lightStates = new Dictionary<int, int>();
            StringBuilder tempState = new StringBuilder(allStates[timeUnit]);
            for (int i = 0; i< allStates[timeUnit].Length; i++)
            {
                if (allStates[timeUnit][i] == 'R' || allStates[timeUnit][i] == 'G' || allStates[timeUnit][i] == 'O')
                    lightStates.Add(i, 0);
            }
            foreach(var key in new List<int>(lightStates.Keys))
            {
                for (int i = timeUnit - 1; i >= 0; i--)
                {
                    lightStates[key] = lightStates[key] + 1;
                    if (lightStates[key] == 5)
                    {
                        if (allStates[timeUnit][key] == 'R')
                        {
                            tempState[key] = 'G';
                            lightStates.Remove(key);
                        }
                        if (allStates[timeUnit][key] == 'G')
                        {
                            tempState[key] = 'O';
                            lightStates.Remove(key);
                        }
                    }
                    else if (allStates[timeUnit][key] == 'O' && lightStates[key] == 1)
                    {
                        tempState[key] = 'R';
                        lightStates.Remove(key);
                    }

                    }
            }
            return tempState.ToString();
        }
    }
}
