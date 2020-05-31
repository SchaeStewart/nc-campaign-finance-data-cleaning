#!/usr/bin/env node
require('dotenv').config();
const db = require('../db');

const limit = process.argv[2] || 0.7

/**
 * Currently this code loops through the raw_contributions table,
 * gets a record that is not in the contributions table,
 * then searches for like records and inserts them into the contributors and contributions table.
 * Doing it this way means all records end up in the contributions table.
*/
(async () => {
  let client = null;
  try {
    client = await db.getClient();
    await client.query('select set_limit($1)', [limit]);
    while (true) { // WARNING infinite loop. The program should exit when there is no search record in the db
      console.time('record')

      // console.time('search') // ~6ms
      const record = (
        await client.query(
          `select id, name, street_line_1 as address from raw_contributions 
            where not exists(select 1 from contributions where source_contribution_id = id)
            limit 1`,
        )
      );
      if (record.rowCount === 0 || record.rows.length === 0) {
        console.log('no search record found. stopping process')
        throw new Error("no search record found. Exiting process")
      }
      // console.timeEnd('search')

      const search = record.rows[0]
      let records = await client.query(
        `select *
        from raw_contributions
        where name % $1
            and street_line_1 % $2
            and id not in (select source_contribution_id from contributions)
            `,
        [search.name, search.address],
      );

      if (records.rowCount < 1) {
        console.log('No matches found for id:', search.id);
        // Handles a bad address case
        records = await client.query(`select * from raw_contributions where id = $1`, [search.id])
      }

      const contributor = await db.insertContributor(records.rows[0]);
      const contributorID = contributor.rows[0].id;
      const rawContributions = records.rows.map((x) => ({
        contributor_id: contributorID,
        source_contribution_id: x.id,
        ...x,
      }));
      const inserts = await db.insertContributions(rawContributions);
      console.timeEnd('record')
      if (inserts.rowCount === records.rowCount) {
        console.log('Processed', inserts.rowCount, 'records');
      } else {
        console.error('Unable to process record');
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    client !== null && client.release();
  }
})();
