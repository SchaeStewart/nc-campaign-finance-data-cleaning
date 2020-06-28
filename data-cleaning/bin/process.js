#!/usr/bin/env node
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

const processRecords = async ({ client, limit, condition }) => {
  await client.query('select set_limit($1)', [limit]);
  await client.query(`create temporary table no_matches (id UUID not null)`);
  let isProcessing = true;
  while (isProcessing) {
    // WARNING infinite loop. The program should exit when there is no search record in the db
    // const tmp = await client.query('select * from no_matches')
    // console.log('no matches', tmp.rowCount)

    const record = await client.query(
      `select id, name, street_line_1 as address, zip_code, city from raw_contributions 
            where not exists (select 1 from contributions where source_contribution_id = id)
              and not exists (select 1 from no_matches where source_contributions_id = id)
            limit 1`,
    );

    if (record.rowCount === 0 || record.rows.length === 0) {
      console.log('no search record found. stopping process');
      isProcessing = false;
      await client.query(`drop table if exists no_matches`)
      continue;
    }

    const search = record.rows[0];
    let records = await client.query(
      `select *
        from raw_contributions
        where name % $1
            and street_line_1 % $2
            not exists (select 1 from contributions where source_contribution_id = id)
            `,
      [search.name, search.address],
    );

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

// TODO: create tmp table at top level from contributors
// Add all info from failed searches to tmp (not just id)
// On second pass search through tmp table instead of raw_contributions
/**
 */
(async () => {
  let client = null;
  try {
    client = await db.getClient();
    const startTime = new Date();
    await processRecords({
      client,
      limit,
      condition: (rowCount) => rowCount > 1,
    });
    await processRecords({
      client,
      limit: '0.3',
      condition: (rowCount) => rowCount === 1,
    });
    await processRecords({
      client,
      limit: '1.0',
      condition: (rowCount) => rowCount === 1,
    });
    const endTime = new Date();
    console.log('Start time', startTime);
    console.log('End time', endTime);
    console.log('Total time', startTime.getTime() - endTime.getTime(), 'ms');
  } catch (e) {
    console.error(e);
  } finally {
    client !== null && client.release();
  }
})();
