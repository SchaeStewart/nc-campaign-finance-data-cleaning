#!/usr/bin/env node
require('dotenv').config();
const db = require('../db');

// Automatically process any results that are match at 100%/80%/70%
// Count number of distinct id's in db after processing

(async () => {
  let client = null;
  try {
    client = await db.getClient();
    await client.query('select set_limit(0.7)');
    while (true) { // WARNING infinite loop
      console.time('x')
    // for (let i = 0; i >= 0; i++) { // WARNING: infinite loop
      const record = (
        await client.query(
          `select name, street_line_1 as address from raw_contributions where id not in (select source_contribution_id from contributions) limit 1`,
        )
      );
      if (record.rowCount === 0 || record.rows.length === 0) {
        break;
      }
      const search = record.rows[0]
      const records = await client.query(
        `select *
        ,similarity(name, $1) as name_sml
        ,similarity(street_line_1, $2) as addr1_sml
        from raw_contributions
        where name % $1
            and street_line_1 % $2
            and id not in (select source_contribution_id from contributions)
            `,
        [search.name, search.address],
      );

      if (records.rowCount < 1) {
        console.log('Skipping record');
        break;
      }

      const contributor = await db.insertContributor(records.rows[0]);
      const contributorID = contributor.rows[0].id;
      const rawContributions = records.rows.map((x) => ({
        contributor_id: contributorID,
        source_contribution_id: x.id,
        ...x,
      }));
      const inserts = await db.insertContributions(rawContributions);
      if (inserts.rowCount === records.rowCount) {
        console.log('Processed', inserts.rowCount, 'records');
      } else {
        console.error('Unable to process record');
      }

      console.timeEnd('x')
    }
    const uniqueContributors = await client.query(
      'select count (distinct id) from contributors',
    )
    console.log('Unique contributors', uniqueContributors.rows[0].count);
  } catch (e) {
    console.error(e);
  } finally {
    client !== null && client.release();
  }
})();
