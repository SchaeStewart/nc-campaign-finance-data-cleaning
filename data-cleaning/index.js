const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const app = express();
const api = express.Router();
api.use(bodyParser.json());
const { PORT: port = 3001, TRGM_LIMIT = 0.5 } = process.env;

api.use((req, res, next) => {
  req.trigramLimit = req.header('x-trigram-limit')
    ? req.header('x-trigram-limit')
    : TRGM_LIMIT;
  next();
});

api.get('/contributions/matches/:name/:addr1', async (req, res) => {
  const client = await db.getClient();
  try {
    const name = decodeURIComponent(req.params.name);
    const addr = decodeURIComponent(req.params.addr1);
    await client.query('select set_limit($1)', [req.trigramLimit]);
    const records = await client.query(
      `select *
     ,similarity(name, $1) as name_sml
     ,similarity(street_line_1, $2) as addr1_sml
     from raw_contributions
     where name % $1
        and street_line_1 % $2`,
      [name, addr],
    );
    console.log(`Retrieved ${records.rowCount} rows`);
    res.send({ data: records.rows, count: records.rowCount });
  } catch (err) {
    handleError(res);
  } finally {
    client.release();
  }
});

/**
 * (future enhancement. Store all variations of names and address in a new lookup table. So for future sets we can auto process using that table)
 * Sample payload
 * {
 *   "data": {
 *     "clean": [],
 *     "unclean": []
 *   }
 * }
 */
api.get('/contributions/raw', async (req, res) => {
  let client = null;
  try {
    client = await db.getClient();
    const record = await client.query(`select name as search_name, street_line_1 as search_address
      from raw_contributions
      where not exists(select 1 from contributions where source_contribution_id = id)
      offset random() * (select count(*)
                        from raw_contributions
                        where not exists(select 1 from contributions where source_contribution_id = id)) limit 1
    `);

    if (record.rowCount < 1) {
      return handleError(res, 'no records found to process');
    }

    const search = {
      name: record.rows[0].search_name,
      address: record.rows[0].search_address,
    };


    // TODO: could match on zip/city to speed up search
    await client.query('select set_limit($1)', [req.trigramLimit]);
    const rawPromise = client.query(
      `select *
     from raw_contributions
     where name % $1
        and street_line_1 % $2
        and id not in (select source_contribution_id from contributions)
        `,
      [search.name, search.address],
    );
    const cleanPromise = client.query(
      `select * from contributors where name % $1 and street_line_1 % $2`,
      [search.name, search.address],
    );
    const [raw, clean] = await Promise.allSettled([rawPromise, cleanPromise]);

    res.send({
      data: {
        raw: raw.value.rows,
        clean: raw.value.rowCount === 0 ? [] : clean.value.rows,
      },
      count: { raw: raw.value.rowCount, clean: clean.value.rowCount },
      search,
    });
  } catch (err) {
    handleError(res, err);
  } finally {
    client !== null && client.release();
  }
});

/**
 * Payload:
 * {
 *   "contributorID": "1234-56789-1234"
 *   "ids": ["uuid1", "uuid2"]
 * }
 */
api.post('/contributions/clean', async (req, res) => {
  let client = null;
  try {
    let { data: ids = [], contributorID = '' } = req.body;
    if (ids.length === 0) {
      return handleError(res, 'unable to process request. data is empty');
    }

    const inStr = ids.map((_, idx) => `\$${idx + 1}`).join(', ');
    client = await db.getClient();
    const records = await client.query(
      `select * from raw_contributions where id in (${inStr})`,
      ids,
    );

    if (records.rows.length === 0) {
      return handleError(
        res,
        'unable to process record. No records found for the given ID',
      );
    }

    // Ensure given contributorID is valid. else insert a new contributor
    if (contributorID !== '') {
      const contributor = await client.query(
        'select * from contributors where id = $1',
        [contributorID],
      );
      if (contributor.rowCount > 1) {
        return handleError(
          res,
          new Error('contributor not found' + JSON.stringify(inserts)),
        );
      }
    } else {
      const contributor = await db.insertContributor(records.rows[0]);
      contributorID = contributor.rows[0].id;
    }

    const rawContributions = records.rows.map((x) => ({
      contributor_id: contributorID,
      source_contribution_id: x.id,
      ...x,
    }));

    const inserts = await db.insertContributions(rawContributions);
    if (inserts.rowCount === records.rowCount) {
      return res.send({ data: { status: 'success' } });
    } else {
      return handleError(
        res,
        new Error('unable to insert contributions' + JSON.stringify(inserts)),
      );
    }
  } catch (err) {
    return handleError(res, err);
  } finally {
    client !== null && client.release();
  }
});

app.use('/api', api);

app.get('/status', (req, res) => res.send({ status: 'online' }));

// Serve react
if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client')));

  // Handle React routing, return all requests to React app
  app.get('*', function (req, res) {
    console.log(req.path);
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });
}

/**
 *
 * @param {Response} res
 * @param {Error} err
 * @param {string} msg
 * @param {number} statusCode
 */
function handleError(
  res,
  err,
  msg = 'error processing request',
  statusCode = 500,
) {
  console.error(err);
  res.status(statusCode).send({ error: msg });
}

app.listen(port, () =>
  console.log(`app listening at http://localhost:${port}`),
);
