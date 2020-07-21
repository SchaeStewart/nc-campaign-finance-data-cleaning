#!/usr/bin/env node
// @ts-check
const fs = require('fs');
const stream = require('stream');
const copyFrom = require('pg-copy-streams').from;
const { getClient } = require('../db');

const fileName = process.argv[2]
  ? process.argv[2]
  : `${__dirname}/../tmp/data.csv`; // EX: ./tmp/data.csvA
const headerMap = {
  name: 'name',
  'street line 1': 'street_line_1',
  'street line 2': 'street_line_2',
  city: 'city',
  state: 'state',
  'zip code': 'zip_code',
  'profession/job title': 'profession',
  "employer's name/specific field": 'employer_name',
  'transction type': 'transaction_type',
  'committee name': 'committee_name',
  'committee sboe id': 'committee_sboe_id',
  'committee street 1': 'committee_street_1',
  'committee street 2': 'committee_street_2',
  'committee city': 'committee_city',
  'committee state': 'committee_state',
  'committee zip code': 'committee_zip_code',
  'report name': 'report_name',
  'date occured': 'date_occurred',
  'account code': 'account_code',
  amount: 'amount',
  'form of payment': 'form_of_payment',
  purpose: 'purpose',
  'candidate/referendum name': 'candidate_or_referendum_name',
  declaration: 'declaration',
};

/**
 * Replaces the header of csv file with a provided headerMap
 */
class HeaderReplacer extends stream.Transform {
  /**
   *
   * @param {object} headerMap
   * @param {stream.TransformOptions} [options]
   */
  constructor(headerMap, options) {
    super(options);
    this.hasReplacedHeader = false;
    this.headerMap = headerMap;
  }

  _transform(chunk, encoding, callback) {
    let resultChunk = chunk;
    if (!this.hasReplacedHeader) {
      const chunks = chunk.toString().split('\n');
      const newHeader = chunks[0]
        .split(',')
        .map((columnHeader) => columnHeader.toLowerCase())
        .map((columnHeader) => this.headerMap[columnHeader]) // Note: If the columnHeader is not present in the headerMap, this will return 'undefined'
        .join(',');

      chunks[0] = newHeader;
      resultChunk = chunks.join('\n');
      this.hasReplacedHeader = true;
    }
    this.push(resultChunk);
    callback();
  }
}

/**
 *
 * @param {*} fileStream
 * @param {string} tableName
 * @param {object} client
 * @param {string}  columns
 */
const copyFromCSV = (fileStream, tableName, client, columns) =>
  new Promise((resolve, reject) => {
    const stream = client.query(
      copyFrom(
        `COPY ${tableName} (${columns}) FROM STDIN DELIMITER ',' csv HEADER`,
      ),
    );
    fileStream.on('error', (error) => {
      reject(error);
    });
    stream.on('error', (error) => {
      reject(error);
    });
    fileStream.pipe(stream).on('finish', () => {
      resolve();
    });
  });

(async () => {
  const fileStream = fs.createReadStream(fileName);
  const replaceHeader = new HeaderReplacer(headerMap);
  const client = await getClient();
  try {
    console.log('Truncating table');
    await client.query('TRUNCATE raw_contributions');

    console.log('Copying file to database');
    const columns = Object.values(headerMap).join(',');
    await copyFromCSV(
      fileStream.pipe(replaceHeader),
      'raw_contributions',
      client,
      columns
    );
    console.log('Copy complete');

    console.log('Dropping Aggregated Non-Media Expenditures');
    await client.query(
      "DELETE FROM raw_contributions WHERE name = 'Aggregated Non-Media Expenditure'",
    );

    console.log('Dropping Aggregated Individual Contribution');
    await client.query(
      "DELETE FROM raw_contributions WHERE name = 'Aggregated Individual Contribution'",
    );

    console.log('Deleting null name and address');
    await client.query(
      'DELETE FROM raw_contributions WHERE name IS NULL OR street_line_1 IS NULL',
    );

    console.log('Reindexing');
    await client.query('REINDEX INDEX raw_contributions_name_street_idx');
  } catch (err) {
    console.error('Error copying file to database', err);
  } finally {
    await client.release();
  }
})();
