#!/usr/bin/env node
//@ts-check
require('dotenv').config();
const db = require('../db');

const limit = process.argv[2] ? process.argv[2] : 0.6;

const cleanRecords = async (uncleanContributions) => {
  const contributor = await db.insertContributor(uncleanContributions.rows[0]);
  const contributorID = contributor.rows[0].id;
  const rawContributions = uncleanContributions.rows.map((x) => ({
    contributor_id: contributorID,
    source_contribution_id: x.id,
    ...x,
  }));
  const inserts = await db.insertContributions(rawContributions);
  if (inserts.rowCount === uncleanContributions.rowCount) {
    console.log('Processed', inserts.rowCount, 'records');
  } else {
    console.error('Unable to process record');
  }
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} name
 * @param {string} address
 * @returns {Promise<import('pg').QueryArrayResult>}
 */
const searchRecords = async (client, name, address) => {
  return client.query(
    `select *
        from raw_contributions
        where name % $1
            and street_line_1 % $2
            and not exists (select 1 from contributions where source_contribution_id = id)
            `,
    [name, address],
  );
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} name
 * @param {string} address
 * @returns {Promise<import('pg').QueryArrayResult>}
 */
const searchNoIdenticals = (client, name, address) => {
  return client.query(
    `select *
      from raw_contributions
        where not exists(select 1 from contributions where source_contribution_id = id)
        and (name % $1)
        and (street_line_1 % $2)
        and (select count(*)
            from raw_contributions
            where not exists(select 1 from contributions where source_contribution_id = id)
              and name % $1) <= 1
        and (select count(*)
            from raw_contributions
            where not exists(select 1 from contributions where source_contribution_id = id)
              and street_line_1 % $2) <= 1`,
    [name, address],
  );
};

/**
 *
 * @param {object} args
 * @param {import('pg').PoolClient} args.client - pg client
 * @param {number|string} args.limit - double representing the trgm_limit
 * @param {function(number):boolean} args.condition - a function that will receive the rowCount, if the function is false, the records will be processed
 * @param {function(import('pg').PoolClient, string, string): import('pg').QueryArrayResult} args.searchFn - a function that will takes a client, name, address as args and returns a pg query result 
 */
const processRecords = async ({ client, limit, condition, searchFn }) => {
  await client.query('select set_limit($1)', [limit]);
  await client.query(`create temporary table no_matches (id UUID not null)`);
  let isProcessing = true;
  while (isProcessing) {
    const record = await client.query(
      `select id, name, street_line_1 as address, zip_code, city from raw_contributions 
            where not exists (select 1 from contributions where source_contribution_id = id)
              and not exists (select 1 from no_matches where raw_contributions.id = id)
            limit 1`,
    );

    if (record.rowCount === 0 || record.rows.length === 0) {
      console.log('no search record found. stopping process');
      isProcessing = false;
      await client.query(`drop table if exists no_matches`);
      continue;
    }

    const search = record.rows[0];
    let records = await searchFn(client, search.name, search.address);
    if (!condition(records.rowCount)) {
      console.log(
        'No matches for name:',
        search.name,
        'address',
        search.address,
      );
      await client.query(`insert into no_matches (id) values ($1)`, [
        search.id,
      ]);
      continue;
    }

    await cleanRecords(records);
  }
};

(async () => {
  let client = null;
  try {
    client = await db.getClient();
    const startTime = new Date();
    await processRecords({
      client,
      limit,
      condition: (rowCount) => rowCount > 1,
      // @ts-ignore
      searchFn: searchRecords
    });
    await processRecords({
      client,
      limit: '0.3',
      condition: (rowCount) => rowCount === 1,
      // @ts-ignore
      searchFn: searchRecords
    });
    // Only process records that do not have a duplicate (or high match) name and address
    await processRecords({
      client,
      limit: '0.8',
      condition: (rowCount) => rowCount === 1,
      // @ts-ignore
      searchFn: searchNoIdenticals
    });
    const endTime = new Date();
    console.log('Start time', startTime);
    console.log('End time', endTime);
    console.log('Total time', endTime.getTime() - startTime.getTime(), 'ms');
  } catch (e) {
    console.error(e);
  } finally {
    client !== null && client.release();
  }
})();
