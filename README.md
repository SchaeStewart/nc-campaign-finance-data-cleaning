# NC Campaign Finance

## How to Run

### Prerequisites

- Docker + Docker Compose
- A recent version of NodeJS (I'm using v12.16.3, but any recent version should be fine)

## Running

From the `data-cleaning` directory:

Run `cp sample.env .env` then edit the values if they need to be changed from the default.

Copy the contributions CSV to `./tmp/data.csv`

```sh
docker-compose up -d # This starts the database running on port 54322 and launches the PGWeb postgres client on port 8081'
npm install
npm run migrate up
node bin/etl.js # Alternatively `node bin/etl.js /path/to/some/file.csv`, if you to use a file other than ./tmp/data.csv
npm run start:dev
```  

The data is now loaded into the database.  
You can view the data in your preferred SQL client or by going to http://localhost:8081 in your browser.  
The server is running on http://localhost:3001

### Auto Process Records

To run the auto process program do the following

*Update your `.env` `DATABASE_URL` if you want to run it against a remote DB*

```sh
node bin/process.js
```

This will run the auto process with a 0.7 (70%) threshold. To use a different threshold do the following:

```sh
node bin/process.js 0.8
```

### Routes  

For all api routes providing a `x-trigram-limit` header will change the match level of the request  
The value of the header should be a decimal number. I.E. `0.7` for a 70% match

GET `api/contributions/matches/:name/:addr` will return records that are similar to the given name and address  
Example to get contributions for John Abbott: `curl localhost:3000/contributions/matches/john%20abbott/410%20S%20Swing%20Rd`  
Alternatively to get contributions of Jon Abbott: `curl localhost:3000/contributions/matches/jon%20abbott/410%20S%20Swing%20Rd`  
You will see the that this request returns the same results

GET `/api/contributions/raw` will return a list of contributions that are a close match
EX:

```json
{
    "data": {
        "raw": [
            {
                "id": "150a9ad1-8732-40ae-a614-dbec4b8c37c0",
                "name": "John Smith",
                "street_line_1": "123 Apple St",
                "street_line_2": null,
                "city": "Raleigh",
                "state": "NC",
                "zip_code": "12345",
                "profession": "Business",
                "employer_name": "Business Place",
                "transaction_type": "Individual",
                "committee_name": "Mrs. Politician",
                "committee_sboe_id": "STA-1234-5678",
                "committee_street_1": "PO BOX 12345",
                "committee_street_2": null,
                "committee_city": "RALEIGH",
                "committee_state": "NC",
                "committee_zip_code": "12345",
                "report_name": "2020 First Quarter",
                "date_occurred": "2/3/20",
                "account_code": "Not Available",
                "amount": 500,
                "form_of_payment": "Check",
                "purpose": null,
                "candidate_or_referendum_name": null,
                "declaration": null
            }
        ],
        "clean": [
            {
                "id": "956fddd7-20cd-407f-9c7a-75fce61cfe6b",
                "name": "John Smith",
                "street_line_1": "123 Apple St",
                "street_line_2": null,
                "city": "Raleigh",
                "state": "NC",
                "zip_code": "12345",
                "profession": "Business",
                "employer_name": "Business Place"
            }
        ]
    },
    "count": {
        "raw": 1,
        "clean": 1
    },
    "search": {
        "name": "John Smith",
        "address": "123 Apple ST"
    }
}
```

POST `/api//contributions/clean` Send a list of contribution ids that all belong to the same contributor
EX:  
`contributorID` is optional. If it is provided, the records will be associated with that ID

```json
{
  "contributorID": "",
  "data": [
    "UUUD1", "UUID2"
  ]
}
```

*Note: Parameters should be URI Encoded*

### Debugging

There are VSCode debug configurations setup for the etl script and the server

<!-- ## Notes -->

## Data Cleaning

### Tables

- raw_contributions (The raw finance dataset)
  - Current fields + UUID
- contributors
  - Individuals information + UUID
- contributions
  - Contribution information + ID field + Contributor_ID

### Stories

- As a data cleaner I should be presented with a list of contributions which are likely matches and be able to indicate which are matches and which are not
  - Matches should be unique. IE multiple people should not see already processed contributions 
- A contributor uuid is created upon record cleaning. This means that if for some reason, the same person came up on two different cleanings, they would be classified as different records

### Concerns

- We may want to rethink how the ETL script works. Currently it truncates the raw_contributions table and reloads the dataset which means each record will be assigned a new UUID. This could cause issues because the contributions table utilizes that UUID
  - One possible solution would be to generate a UUIDV5 for each record using the fields in the record while ingesting the record and before inserting into the database. This probably isn't the cleanest solution, but I wanted to document the idea and concern somewhere.


### Future enhancements

- Use a UUIDv5 or UUIDv3 and generate the UUID from the raw_contribution. This would give us reproducible UUIDs, which would make future data cleaning easier and more stable 
- For future cleaning, we can store all known permutations of a given contributors name and address and then make unclean data against it
- Define onconflict conditions

## How To's

### Load data into Heroku

The auto process script chokes when running against Heroku database so to get around it you can do the following:  
(NB: I haven't tried running this on a database with data already in it yet)

1. Load the data locally and run the auto process
2. Run `node bin/exportToCSV.js`
   1. This should output 3 csv files
   2. Optionally run `node bin/exportToCSV.js some/other/directory` to specify the output directory
3. Run the `node bin/importFromCSV.js table_name file_path` for each of the outputted files
   1. EX: `node bin/importFromCSV.js raw_contributions ./raw_contributions.csv`
   1. EX: `node bin/importFromCSV.js  contributions ./contributions.csv`
   1. EX: `node bin/importFromCSV.js contributors ./contributors.csv`
   1. Remember to set the `DATABASE_URL` environment variable and to add the `?sslmode=require` to load the data into Heroku