using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace Round2P1
{
    public class Program
    {
        static void Main(string[] args)
        {
            List<RecordModel> dataset;
            using(StreamReader r = new StreamReader("../../../files/startup-funding.json"))
            {
                dataset = JsonSerializer.Deserialize<List<RecordModel>>(r.ReadToEnd());
            }
            FilterObject filter = new FilterObject()
            {
                CompanyName = "Facebook"
            };
            RecordModel firstOctRecord = dataset.FindBy(filter);
            Console.WriteLine(firstOctRecord);
            FilterObject secondFilter = new FilterObject()
            {
                CompanyName = "Facebook",
                Round = "a"
            };
            var noEmployees = dataset.Where(secondFilter);
            Console.WriteLine("Number of companies with no employees " + noEmployees.Count);
        }
    }
    public static class FilterMethods
    {
        public static bool IsAMatch(RecordModel record, FilterObject filter)
        {
            return TryMatchStrings(record.company_name, filter.CompanyName)
                && TryMatchStrings(record.city, filter.City)
                && TryMatchStrings(record.state, filter.State)
                && TryMatchStrings(record.round, filter.Round);
        }
        public static bool TryMatchStrings(string first, string second)
        {
            if (string.IsNullOrEmpty(first))
                return false;
            if (string.IsNullOrEmpty(second))
                return true;
            return first.Equals(second);
        }
        public static RecordModel FindBy(this List<RecordModel>baseList, FilterObject filter)
        {
            foreach(RecordModel record in baseList)
            {
                if (IsAMatch(record, filter))
                    return record;
            }
            return null;
        }
        public static List<RecordModel> Where(this List<RecordModel> baseList, FilterObject filter)
        {
            List<RecordModel> resultList = new List<RecordModel>();
            foreach (RecordModel record in baseList)
            {
                if (IsAMatch(record, filter))
                    resultList.Add(record);
            }
            return resultList;
        }
    }
    public class FilterObject
    {
        public string CompanyName { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string Round { get; set; }
    }
    public class RecordModel
    {
        public string permalink { get; set; }
        public string company_name { get; set; }
        public int number_employees { get; set; }
        public string category { get; set; }
        public string city { get; set; }
        public string state { get; set; }
        public string funded_date { get; set; }
        public int raised_amount { get; set; }
        public string raised_currency { get; set; }
        public string round { get; set; }
        public override string ToString()
        {
            return $"Permalink: {permalink}\n" +
                   $"Company Name: {company_name}\n" +
                   $"Number of employees: {number_employees}\n" +
                   $"Category: {category}\n" +
                   $"City: {city}\n" +
                   $"State: {state}\n" +
                   $"Funded Date: {funded_date}\n" +
                   $"Raised Amount: {raised_amount} {raised_currency}\n" +
                   $"Round: {round}\n";
        }
    }
}
