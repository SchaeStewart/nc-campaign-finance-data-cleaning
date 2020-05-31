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

GET `/contributions/matches/:name/:addr` will return records that are similar to the given name and address  
Example to get contributions for John Abbott: `curl localhost:3000/contributions/matches/john%20abbott/410%20S%20Swing%20Rd`  
Alternatively to get contributions of Jon Abbott: `curl localhost:3000/contributions/matches/jon%20abbott/410%20S%20Swing%20Rd`  
You will see the that this request returns the same results

GET `/contributions/raw` will return a list of contributions that are a close match

POST `/contributions/clean` Send a list of contribution ids that all belong to the same contributor
EX:

```json
{
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
